(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('http'), require('fs'), require('crypto')) :
        typeof define === 'function' && define.amd ? define(['http', 'fs', 'crypto'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Server = factory(global.http, global.fs, global.crypto));
}(this, (function (http, fs, crypto) {
    'use strict';

    function _interopDefaultLegacy(e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
    var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
    var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);

    class ServiceError extends Error {
        constructor(message = 'Service Error') {
            super(message);
            this.name = 'ServiceError';
        }
    }

    class NotFoundError extends ServiceError {
        constructor(message = 'Resource not found') {
            super(message);
            this.name = 'NotFoundError';
            this.status = 404;
        }
    }

    class RequestError extends ServiceError {
        constructor(message = 'Request error') {
            super(message);
            this.name = 'RequestError';
            this.status = 400;
        }
    }

    class ConflictError extends ServiceError {
        constructor(message = 'Resource conflict') {
            super(message);
            this.name = 'ConflictError';
            this.status = 409;
        }
    }

    class AuthorizationError extends ServiceError {
        constructor(message = 'Unauthorized') {
            super(message);
            this.name = 'AuthorizationError';
            this.status = 401;
        }
    }

    class CredentialError extends ServiceError {
        constructor(message = 'Forbidden') {
            super(message);
            this.name = 'CredentialError';
            this.status = 403;
        }
    }

    var errors = {
        ServiceError,
        NotFoundError,
        RequestError,
        ConflictError,
        AuthorizationError,
        CredentialError
    };

    const { ServiceError: ServiceError$1 } = errors;


    function createHandler(plugins, services) {
        return async function handler(req, res) {
            const method = req.method;
            console.info(`<< ${req.method} ${req.url}`);

            // Redirect fix for admin panel relative paths
            if (req.url.slice(-6) == '/admin') {
                res.writeHead(302, {
                    'Location': `http://${req.headers.host}/admin/`
                });
                return res.end();
            }

            let status = 200;
            let headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            };
            let result = '';
            let context;

            // NOTE: the OPTIONS method results in undefined result and also it never processes plugins - keep this in mind
            if (method == 'OPTIONS') {
                Object.assign(headers, {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Credentials': false,
                    'Access-Control-Max-Age': '86400',
                    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin'
                });
            } else {
                try {
                    context = processPlugins();
                    await handle(context);
                } catch (err) {
                    if (err instanceof ServiceError$1) {
                        status = err.status || 400;
                        result = composeErrorObject(err.code || status, err.message);
                    } else {
                        // Unhandled exception, this is due to an error in the service code - REST consumers should never have to encounter this;
                        // If it happens, it must be debugged in a future version of the server
                        console.error(err);
                        status = 500;
                        result = composeErrorObject(500, 'Server Error');
                    }
                }
            }

            res.writeHead(status, headers);
            if (context != undefined && context.util != undefined && context.util.throttle) {
                await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
            }
            res.end(result);

            function processPlugins() {
                const context = { params: {} };
                plugins.forEach(decorate => decorate(context, req));
                return context;
            }

            async function handle(context) {
                const { serviceName, tokens, query, body } = await parseRequest(req);
                if (serviceName == 'admin') {
                    return ({ headers, result } = services['admin'](method, tokens, query, body));
                } else if (serviceName == 'favicon.ico') {
                    return ({ headers, result } = services['favicon'](method, tokens, query, body));
                }

                const service = services[serviceName];

                if (service === undefined) {
                    status = 400;
                    result = composeErrorObject(400, `Service "${serviceName}" is not supported`);
                    console.error('Missing service ' + serviceName);
                } else {
                    result = await service(context, { method, tokens, query, body });
                }

                // NOTE: logout does not return a result
                // in this case the content type header should be omitted, to allow checks on the client
                if (result !== undefined) {
                    result = JSON.stringify(result);
                } else {
                    status = 204;
                    delete headers['Content-Type'];
                }
            }
        };
    }



    function composeErrorObject(code, message) {
        return JSON.stringify({
            code,
            message
        });
    }

    async function parseRequest(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokens = url.pathname.split('/').filter(x => x.length > 0);
        const serviceName = tokens.shift();
        const queryString = url.search.split('?')[1] || '';
        const query = queryString
            .split('&')
            .filter(s => s != '')
            .map(x => x.split('='))
            .reduce((p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v) }), {});
        const body = await parseBody(req);

        return {
            serviceName,
            tokens,
            query,
            body
        };
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    resolve(body);
                }
            });
        });
    }

    var requestHandler = createHandler;

    class Service {
        constructor() {
            this._actions = [];
            this.parseRequest = this.parseRequest.bind(this);
        }

        /**
         * Handle service request, after it has been processed by a request handler
         * @param {*} context Execution context, contains result of middleware processing
         * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
         */
        async parseRequest(context, request) {
            for (let { method, name, handler } of this._actions) {
                if (method === request.method && matchAndAssignParams(context, request.tokens[0], name)) {
                    return await handler(context, request.tokens.slice(1), request.query, request.body);
                }
            }
        }

        /**
         * Register service action
         * @param {string} method HTTP method
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        registerAction(method, name, handler) {
            this._actions.push({ method, name, handler });
        }

        /**
         * Register GET action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        get(name, handler) {
            this.registerAction('GET', name, handler);
        }

        /**
         * Register POST action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        post(name, handler) {
            this.registerAction('POST', name, handler);
        }

        /**
         * Register PUT action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        put(name, handler) {
            this.registerAction('PUT', name, handler);
        }

        /**
         * Register PATCH action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        patch(name, handler) {
            this.registerAction('PATCH', name, handler);
        }

        /**
         * Register DELETE action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        delete(name, handler) {
            this.registerAction('DELETE', name, handler);
        }
    }

    function matchAndAssignParams(context, name, pattern) {
        if (pattern == '*') {
            return true;
        } else if (pattern[0] == ':') {
            context.params[pattern.slice(1)] = name;
            return true;
        } else if (name == pattern) {
            return true;
        } else {
            return false;
        }
    }

    var Service_1 = Service;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var util = {
        uuid
    };

    const uuid$1 = util.uuid;


    const data = fs__default['default'].existsSync('./data') ? fs__default['default'].readdirSync('./data').reduce((p, c) => {
        const content = JSON.parse(fs__default['default'].readFileSync('./data/' + c));
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
            p[collection][endpoint] = content[endpoint];
        }
        return p;
    }, {}) : {};

    const actions = {
        get: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            return responseData;
        },
        post: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            // TODO handle collisions, replacement
            let responseData = data;
            for (let token of tokens) {
                if (responseData.hasOwnProperty(token) == false) {
                    responseData[token] = {};
                }
                responseData = responseData[token];
            }

            const newId = uuid$1();
            responseData[newId] = Object.assign({}, body, { _id: newId });
            return responseData[newId];
        },
        put: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens.slice(0, -1)) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined && responseData[tokens.slice(-1)] !== undefined) {
                responseData[tokens.slice(-1)] = body;
            }
            return responseData[tokens.slice(-1)];
        },
        patch: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined) {
                Object.assign(responseData, body);
            }
            return responseData;
        },
        delete: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (responseData.hasOwnProperty(token) == false) {
                    return null;
                }
                if (i == tokens.length - 1) {
                    const body = responseData[token];
                    delete responseData[token];
                    return body;
                } else {
                    responseData = responseData[token];
                }
            }
        }
    };

    const dataService = new Service_1();
    dataService.get(':collection', actions.get);
    dataService.post(':collection', actions.post);
    dataService.put(':collection', actions.put);
    dataService.patch(':collection', actions.patch);
    dataService.delete(':collection', actions.delete);


    var jsonstore = dataService.parseRequest;

    /*
     * This service requires storage and auth plugins
     */

    const { AuthorizationError: AuthorizationError$1 } = errors;



    const userService = new Service_1();

    userService.get('me', getSelf);
    userService.post('register', onRegister);
    userService.post('login', onLogin);
    userService.get('logout', onLogout);


    function getSelf(context, tokens, query, body) {
        if (context.user) {
            const result = Object.assign({}, context.user);
            delete result.hashedPassword;
            return result;
        } else {
            throw new AuthorizationError$1();
        }
    }

    function onRegister(context, tokens, query, body) {
        return context.auth.register(body);
    }

    function onLogin(context, tokens, query, body) {
        return context.auth.login(body);
    }

    function onLogout(context, tokens, query, body) {
        return context.auth.logout();
    }

    var users = userService.parseRequest;

    const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } = errors;


    var crud = {
        get,
        post,
        put,
        patch,
        delete: del
    };


    function validateRequest(context, tokens, query) {
        /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
        if (tokens.length > 1) {
            throw new RequestError$1();
        }
    }

    function parseWhere(query) {
        const operators = {
            '<=': (prop, value) => record => record[prop] <= JSON.parse(value),
            '<': (prop, value) => record => record[prop] < JSON.parse(value),
            '>=': (prop, value) => record => record[prop] >= JSON.parse(value),
            '>': (prop, value) => record => record[prop] > JSON.parse(value),
            '=': (prop, value) => record => record[prop] == JSON.parse(value),
            ' like ': (prop, value) => record => record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
            ' in ': (prop, value) => record => JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
        };
        const pattern = new RegExp(`^(.+?)(${Object.keys(operators).join('|')})(.+?)$`, 'i');

        try {
            let clauses = [query.trim()];
            let check = (a, b) => b;
            let acc = true;
            if (query.match(/ and /gi)) {
                // inclusive
                clauses = query.split(/ and /gi);
                check = (a, b) => a && b;
                acc = true;
            } else if (query.match(/ or /gi)) {
                // optional
                clauses = query.split(/ or /gi);
                check = (a, b) => a || b;
                acc = false;
            }
            clauses = clauses.map(createChecker);

            return (record) => clauses
                .map(c => c(record))
                .reduce(check, acc);
        } catch (err) {
            throw new Error('Could not parse WHERE clause, check your syntax.');
        }

        function createChecker(clause) {
            let [match, prop, operator, value] = pattern.exec(clause);
            [prop, value] = [prop.trim(), value.trim()];

            return operators[operator.toLowerCase()](prop, value);
        }
    }


    function get(context, tokens, query, body) {
        validateRequest(context, tokens);

        let responseData;

        try {
            if (query.where) {
                responseData = context.storage.get(context.params.collection).filter(parseWhere(query.where));
            } else if (context.params.collection) {
                responseData = context.storage.get(context.params.collection, tokens[0]);
            } else {
                // Get list of collections
                return context.storage.get();
            }

            if (query.sortBy) {
                const props = query.sortBy
                    .split(',')
                    .filter(p => p != '')
                    .map(p => p.split(' ').filter(p => p != ''))
                    .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));

                // Sorting priority is from first to last, therefore we sort from last to first
                for (let i = props.length - 1; i >= 0; i--) {
                    let { prop, desc } = props[i];
                    responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
                        if (typeof propA == 'number' && typeof propB == 'number') {
                            return (propA - propB) * (desc ? -1 : 1);
                        } else {
                            return propA.localeCompare(propB) * (desc ? -1 : 1);
                        }
                    });
                }
            }

            if (query.offset) {
                responseData = responseData.slice(Number(query.offset) || 0);
            }
            const pageSize = Number(query.pageSize) || 10;
            if (query.pageSize) {
                responseData = responseData.slice(0, pageSize);
            }

            if (query.distinct) {
                const props = query.distinct.split(',').filter(p => p != '');
                responseData = Object.values(responseData.reduce((distinct, c) => {
                    const key = props.map(p => c[p]).join('::');
                    if (distinct.hasOwnProperty(key) == false) {
                        distinct[key] = c;
                    }
                    return distinct;
                }, {}));
            }

            if (query.count) {
                return responseData.length;
            }

            if (query.select) {
                const props = query.select.split(',').filter(p => p != '');
                responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                function transform(r) {
                    const result = {};
                    props.forEach(p => result[p] = r[p]);
                    return result;
                }
            }

            if (query.load) {
                const props = query.load.split(',').filter(p => p != '');
                props.map(prop => {
                    const [propName, relationTokens] = prop.split('=');
                    const [idSource, collection] = relationTokens.split(':');
                    console.log(`Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`);
                    const storageSource = collection == 'users' ? context.protectedStorage : context.storage;
                    responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                    function transform(r) {
                        const seekId = r[idSource];
                        const related = storageSource.get(collection, seekId);
                        delete related.hashedPassword;
                        r[propName] = related;
                        return r;
                    }
                });
            }

        } catch (err) {
            console.error(err);
            if (err.message.includes('does not exist')) {
                throw new NotFoundError$1();
            } else {
                throw new RequestError$1(err.message);
            }
        }

        context.canAccess(responseData);

        return responseData;
    }

    function post(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length > 0) {
            throw new RequestError$1('Use PUT to update records');
        }
        context.canAccess(undefined, body);

        body._ownerId = context.user._id;
        let responseData;

        try {
            responseData = context.storage.add(context.params.collection, body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function put(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.set(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function patch(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.merge(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function del(context, tokens, query, body) {
        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing);

        try {
            responseData = context.storage.delete(context.params.collection, tokens[0]);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    /*
     * This service requires storage and auth plugins
     */

    const dataService$1 = new Service_1();
    dataService$1.get(':collection', crud.get);
    dataService$1.post(':collection', crud.post);
    dataService$1.put(':collection', crud.put);
    dataService$1.patch(':collection', crud.patch);
    dataService$1.delete(':collection', crud.delete);

    var data$1 = dataService$1.parseRequest;

    const imgdata = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAPNnpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHja7ZpZdiS7DUT/uQovgSQ4LofjOd6Bl+8LZqpULbWm7vdnqyRVKQeCBAKBAFNm/eff2/yLr2hzMSHmkmpKlq9QQ/WND8VeX+38djac3+cr3af4+5fj5nHCc0h4l+vP8nJicdxzeN7Hxz1O43h8Gmi0+0T/9cT09/jlNuAeBs+XuMuAvQ2YeQ8k/jrhwj2Re3mplvy8hH3PKPr7SLl+jP6KkmL2OeErPnmbQ9q8Rmb0c2ynxafzO+eET7mC65JPjrM95exN2jmmlYLnophSTKLDZH+GGAwWM0cyt3C8nsHWWeG4Z/Tio7cHQiZ2M7JK8X6JE3t++2v5oj9O2nlvfApc50SkGQ5FDnm5B2PezJ8Bw1PUPvl6cYv5G788u8V82y/lPTgfn4CC+e2JN+Ds5T4ubzCVHu8M9JsTLr65QR5m/LPhvh6G/S8zcs75XzxZXn/2nmXvda2uhURs051x51bzMgwXdmIl57bEK/MT+ZzPq/IqJPEA+dMO23kNV50HH9sFN41rbrvlJu/DDeaoMci8ez+AjB4rkn31QxQxQV9u+yxVphRgM8CZSDDiH3Nxx2499oYrWJ6OS71jMCD5+ct8dcF3XptMNupie4XXXQH26nCmoZHT31xGQNy+4xaPg19ejy/zFFghgvG4ubDAZvs1RI/uFVtyACBcF3m/0sjlqVHzByUB25HJOCEENjmJLjkL2LNzQXwhQI2Ze7K0EwEXo59M0geRRGwKOMI292R3rvXRX8fhbuJDRkomNlUawQohgp8cChhqUWKIMZKxscQamyEBScaU0knM1E6WxUxO5pJrbkVKKLGkkksptbTqq1AjYiWLa6m1tobNFkyLjbsbV7TWfZceeuyp51567W0AnxFG1EweZdTRpp8yIayZZp5l1tmWI6fFrLDiSiuvsupqG6xt2WFHOCXvsutuj6jdUX33+kHU3B01fyKl1+VH1Diasw50hnDKM1FjRsR8cEQ8awQAtNeY2eJC8Bo5jZmtnqyInklGjc10thmXCGFYzsftHrF7jdy342bw9Vdx89+JnNHQ/QOR82bJm7j9JmqnGo8TsSsL1adWyD7Or9J8aTjbXx/+9v3/A/1vDUS9tHOXtLaM6JoBquRHJFHdaNU5oF9rKVSjYNewoFNsW032cqqCCx/yljA2cOy7+7zJ0biaicv1TcrWXSDXVT3SpkldUqqPIJj8p9oeWVs4upKL3ZHgpNzYnTRv5EeTYXpahYRgfC+L/FyxBphCmPLK3W1Zu1QZljTMJe5AIqmOyl0qlaFCCJbaPAIMWXzurWAMXiB1fGDtc+ld0ZU12k5cQq4v7+AB2x3qLlQ3hyU/uWdzzgUTKfXSputZRtp97hZ3z4EE36WE7WtjbqMtMr912oRp47HloZDlywxJ+uyzmrW91OivysrM1Mt1rZbrrmXm2jZrYWVuF9xZVB22jM4ccdaE0kh5jIrnzBy5w6U92yZzS1wrEao2ZPnE0tL0eRIpW1dOWuZ1WlLTqm7IdCESsV5RxjQ1/KWC/y/fPxoINmQZI8Cli9oOU+MJYgrv006VQbRGC2Ug8TYzrdtUHNjnfVc6/oN8r7tywa81XHdZN1QBUhfgzRLzmPCxu1G4sjlRvmF4R/mCYdUoF2BYNMq4AjD2GkMGhEt7PAJfKrH1kHmj8eukyLb1oCGW/WdAtx0cURYqtcGnNlAqods6UnaRpY3LY8GFbPeSrjKmsvhKnWTtdYKhRW3TImUqObdpGZgv3ltrdPwwtD+l1FD/htxAwjdUzhtIkWNVy+wBUmDtphwgVemd8jV1miFXWTpumqiqvnNuArCrFMbLPexJYpABbamrLiztZEIeYPasgVbnz9/NZxe4p/B+FV3zGt79B9S0Jc0Lu+YH4FXsAsa2YnRIAb2thQmGc17WdNd9cx4+y4P89EiVRKB+CvRkiPTwM7Ts+aZ5aV0C4zGoqyOGJv3yGMJaHXajKbOGkm40Ychlkw6c6hZ4s+SDJpsmncwmm8ChEmBWspX8MkFB+kzF1ZlgoGWiwzY6w4AIPDOcJxV3rtUnabEgoNBB4MbNm8GlluVIpsboaKl0YR8kGnXZH3JQZrH2MDxxRrHFUduh+CvQszakraM9XNo7rEVjt8VpbSOnSyD5dwLfVI4+Sl+DCZc5zU6zhrXnRhZqUowkruyZupZEm/dA2uVTroDg1nfdJMBua9yCJ8QPtGw2rkzlYLik5SBzUGSoOqBMJvwTe92eGgOVx8/T39TP0r/PYgfkP1IEyGVhYHXyJiVPU0skB3dGqle6OZuwj/Hw5c2gV5nEM6TYaAryq3CRXsj1088XNwt0qcliqNc6bfW+TttRydKpeJOUWTmmUiwJKzpr6hkVzzLrVs+s66xEiCwOzfg5IRgwQgFgrriRlg6WQS/nGyRUNDjulWsUbO8qu/lWaWeFe8QTs0puzrxXH1H0b91KgDm2dkdrpkpx8Ks2zZu4K1GHPpDxPdCL0RH0SZZrGX8hRKTA+oUPzQ+I0K1C16ZSK6TR28HUdlnfpzMsIvd4TR7iuSe/+pn8vief46IQULRGcHvRVUyn9aYeoHbGhEbct+vEuzIxhxJrgk1oyo3AFA7eSSSNI/Vxl0eLMCrJ/j1QH0ybj0C9VCn9BtXbz6Kd10b8QKtpTnecbnKHWZxcK2OiKCuViBHqrzM2T1uFlGJlMKFKRF1Zy6wMqQYtgKYc4PFoGv2dX2ixqGaoFDhjzRmp4fsygFZr3t0GmBqeqbcBFpvsMVCNajVWcLRaPBhRKc4RCCUGZphKJdisKdRjDKdaNbZfwM5BulzzCvyv0AsAlu8HOAdIXAuMAg0mWa0+0vgrODoHlm7Y7rXUHmm9r2RTLpXwOfOaT6iZdASpqOIXfiABLwQkrSPFXQgAMHjYyEVrOBESVgS4g4AxcXyiPwBiCF6g2XTPk0hqn4D67rbQVFv0Lam6Vfmvq90B3WgV+peoNRb702/tesrImcBCvIEaGoI/8YpKa1XmDNr1aGUwjDETBa3VkOLYVLGKeWQcd+WaUlsMdTdUg3TcUPvdT20ftDW4+injyAarDRVVRgc906sNTo1cu7LkDGewjkQ35Z7l4Htnx9MCkbenKiNMsif+5BNVnA6op3gZVZtjIAacNia+00w1ZutIibTMOJ7IISctvEQGDxEYDUSxUiH4R4kkH86dMywCqVJ2XpzkUYUgW3mDPmz0HLW6w9daRn7abZmo4QR5i/A21r4oEvCC31oajm5CR1yBZcIfN7rmgxM9qZBhXh3C6NR9dCS1PTMJ30c4fEcwkq0IXdphpB9eg4x1zycsof4t6C4jyS68eW7OonpSEYCzb5dWjQH3H5fWq2SH41O4LahPrSJA77KqpJYwH6pdxDfDIgxLR9GptCKMoiHETrJ0wFSR3Sk7yI97KdBVSHXeS5FBnYKIz1JU6VhdCkfHIP42o0V6aqgg00JtZfdK6hPeojtXvgfnE/VX0p0+fqxp2/nDfvBuHgeo7ppkrr/MyU1dT73n5B/qi76+lzMnVnHRJDeZOyj3XXdQrrtOUPQunDqgDlz+iuS3QDafITkJd050L0Hi2kiRBX52pIVso0ZpW1YQsT2VRgtxm9iiqU2qXyZ0OdvZy0J1gFotZFEuGrnt3iiiXvECX+UcWBqpPlgLRkdN7cpl8PxDjWseAu1bPdCjBSrQeVD2RHE7bRhMb1Qd3VHVXVNBewZ3Wm7avbifhB+4LNQrmp0WxiCNkm7dd7mV39SnokrvfzIr+oDSFq1D76MZchw6Vl4Z67CL01I6ZiX/VEqfM1azjaSkKqC+kx67tqTg5ntLii5b96TAA3wMTx2NvqsyyUajYQHJ1qkpmzHQITXDUZRGTYtNw9uLSndMmI9tfMdEeRgwWHB7NlosyivZPlvT5KIOc+GefU9UhA4MmKFXmhAuJRFVWHRJySbREImpQysz4g3uJckihD7P84nWtLo7oR4tr8IKdSBXYvYaZnm3ffhh9nyWPDa+zQfzdULsFlr/khrMb7hhAroOKSZgxbUzqdiVIhQc+iZaTbpesLXSbIfbjwXTf8AjbnV6kTpD4ZsMdXMK45G1NRiMdh/bLb6oXX+4rWHen9BW+xJDV1N+i6HTlKdLDMnVkx8tdHryus3VlCOXXKlDIiuOkimXnmzmrtbGqmAHL1TVXU73PX5nx3xhSO3QKtBqbd31iQHHBNXXrYIXHVyQqDGIcc6qHEcz2ieN+radKS9br/cGzC0G7g0YFQPGdqs7MI6pOt2BgYtt/4MNW8NJ3VT5es/izZZFd9yIfwY1lUubGSSnPiWWzDpAN+sExNptEoBx74q8bAzdFu6NocvC2RgK2WR7doZodiZ6OgoUrBoWIBM2xtMHXUX3GGktr5RtwPZ9tTWfleFP3iEc2hTar6IC1Y55ktYKQtXTsKkfgQ+al0aXBCh2dlCxdBtLtc8QJ4WUKIX+jlRR/TN9pXpNA1bUC7LaYUzJvxr6rh2Q7ellILBd0PcFF5F6uArA6ODZdjQYosZpf7lbu5kNFfbGUUY5C2p7esLhhjw94Miqk+8tDPgTVXX23iliu782KzsaVdexRSq4NORtmY3erV/NFsJU9S7naPXmPGLYvuy5USQA2pcb4z/fYafpPj0t5HEeD1y7W/Z+PHA2t8L1eGCCeFS/Ph04Hafu+Uf8ly2tjUNDQnNUIOqVLrBLIwxK67p3fP7LaX/LjnlniCYv6jNK0ce5YrPud1Gc6LQWg+sumIt2hCCVG3e8e5tsLAL2qWekqp1nKPKqKIJcmxO3oljxVa1TXVDVWmxQ/lhHHnYNP9UDrtFdwekRKCueDRSRAYoo0nEssbG3znTTDahVUXyDj+afeEhn3w/UyY0fSv5b8ZuSmaDVrURYmBrf0ZgIMOGuGFNG3FH45iA7VFzUnj/odcwHzY72OnQEhByP3PtKWxh/Q+/hkl9x5lEic5ojDGgEzcSpnJEwY2y6ZN0RiyMBhZQ35AigLvK/dt9fn9ZJXaHUpf9Y4IxtBSkanMxxP6xb/pC/I1D1icMLDcmjZlj9L61LoIyLxKGRjUcUtOiFju4YqimZ3K0odbd1Usaa7gPp/77IJRuOmxAmqhrWXAPOftoY0P/BsgifTmC2ChOlRSbIMBjjm3bQIeahGwQamM9wHqy19zaTCZr/AtjdNfWMu8SZAAAA13pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHjaPU9LjkMhDNtzijlCyMd5HKflgdRdF72/xmFGJSIEx9ihvd6f2X5qdWizy9WH3+KM7xrRp2iw6hLARIfnSKsqoRKGSEXA0YuZVxOx+QcnMMBKJR2bMdNUDraxWJ2ciQuDDPKgNDA8kakNOwMLriTRO2Alk3okJsUiidC9Ex9HbNUMWJz28uQIzhhNxQduKhdkujHiSJVTCt133eqpJX/6MDXh7nrXydzNq9tssr14NXuwFXaoh/CPiLRfLvxMyj3GtTgAAAGFaUNDUElDQyBwcm9maWxlAAB4nH2RPUjDQBzFX1NFKfUD7CDikKE6WRAVESepYhEslLZCqw4ml35Bk4YkxcVRcC04+LFYdXBx1tXBVRAEP0Dc3JwUXaTE/yWFFjEeHPfj3b3H3TtAqJeZanaMA6pmGclYVMxkV8WuVwjoRQCz6JeYqcdTi2l4jq97+Ph6F+FZ3uf+HD1KzmSATySeY7phEW8QT29aOud94hArSgrxOfGYQRckfuS67PIb54LDAs8MGenkPHGIWCy0sdzGrGioxFPEYUXVKF/IuKxw3uKslquseU/+wmBOW0lxneYwYlhCHAmIkFFFCWVYiNCqkWIiSftRD/+Q40+QSyZXCYwcC6hAheT4wf/gd7dmfnLCTQpGgc4X2/4YAbp2gUbNtr+PbbtxAvifgSut5a/UgZlP0mstLXwE9G0DF9ctTd4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC';
    const img = Buffer.from(imgdata, 'base64');

    var favicon = (method, tokens, query, body) => {
        console.log('serving favicon...');
        const headers = {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        };
        let result = img;

        return {
            headers,
            result
        };
    };

    var require$$0 = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: '';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type=\"module\">\nimport { html, render } from 'https://unpkg.com/lit-html?module';\nimport { until } from 'https://unpkg.com/lit-html/directives/until?module';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: 'POST',\r\n            headers: { 'Content-Type': 'application/json' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch('/' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get('data');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get('data/' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get('util/throttle');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post('util', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class=\"collection-list\">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href=\"javascript:void(0)\" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set(['_id']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from '//unpkg.com/page/page.mjs';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector('main');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class=\"col\">Loading&hellip;</div>`;\r\n    let viewer = html`<div class=\"col\">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class=\"col\">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class=\"layout\">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class=\"layout\">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class=\"col\">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>";

    const mode = process.argv[2] == '-dev' ? 'dev' : 'prod';

    const files = {
        index: mode == 'prod' ? require$$0 : fs__default['default'].readFileSync('./client/index.html', 'utf-8')
    };

    var admin = (method, tokens, query, body) => {
        const headers = {
            'Content-Type': 'text/html'
        };
        let result = '';

        const resource = tokens.join('/');
        if (resource && resource.split('.').pop() == 'js') {
            headers['Content-Type'] = 'application/javascript';

            files[resource] = files[resource] || fs__default['default'].readFileSync('./client/' + resource, 'utf-8');
            result = files[resource];
        } else {
            result = files.index;
        }

        return {
            headers,
            result
        };
    };

    /*
     * This service requires util plugin
     */

    const utilService = new Service_1();

    utilService.post('*', onRequest);
    utilService.get(':service', getStatus);

    function getStatus(context, tokens, query, body) {
        return context.util[context.params.service];
    }

    function onRequest(context, tokens, query, body) {
        Object.entries(body).forEach(([k, v]) => {
            console.log(`${k} ${v ? 'enabled' : 'disabled'}`);
            context.util[k] = v;
        });
        return '';
    }

    var util$1 = utilService.parseRequest;

    var services = {
        jsonstore,
        users,
        data: data$1,
        favicon,
        admin,
        util: util$1
    };

    const { uuid: uuid$2 } = util;


    function initPlugin(settings) {
        const storage = createInstance(settings.seedData);
        const protectedStorage = createInstance(settings.protectedData);

        return function decoreateContext(context, request) {
            context.storage = storage;
            context.protectedStorage = protectedStorage;
        };
    }


    /**
     * Create storage instance and populate with seed data
     * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
     */
    function createInstance(seedData = {}) {
        const collections = new Map();

        // Initialize seed data from file    
        for (let collectionName in seedData) {
            if (seedData.hasOwnProperty(collectionName)) {
                const collection = new Map();
                for (let recordId in seedData[collectionName]) {
                    if (seedData.hasOwnProperty(collectionName)) {
                        collection.set(recordId, seedData[collectionName][recordId]);
                    }
                }
                collections.set(collectionName, collection);
            }
        }


        // Manipulation

        /**
         * Get entry by ID or list of all entries from collection or list of all collections
         * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
         * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
         * @return {Object} Matching entry.
         */
        function get(collection, id) {
            if (!collection) {
                return [...collections.keys()];
            }
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!id) {
                const entries = [...targetCollection.entries()];
                let result = entries.map(([k, v]) => {
                    return Object.assign(deepCopy(v), { _id: k });
                });
                return result;
            }
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            const entry = targetCollection.get(id);
            return Object.assign(deepCopy(entry), { _id: id });
        }

        /**
         * Add new entry to collection. ID will be auto-generated
         * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
         * @param {Object} data Value to store.
         * @return {Object} Original value with resulting ID under _id property.
         */
        function add(collection, data) {
            const record = assignClean({ _ownerId: data._ownerId }, data);

            let targetCollection = collections.get(collection);
            if (!targetCollection) {
                targetCollection = new Map();
                collections.set(collection, targetCollection);
            }
            let id = uuid$2();
            // Make sure new ID does not match existing value
            while (targetCollection.has(id)) {
                id = uuid$2();
            }

            record._createdOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Replace entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Record will be replaced!
         * @return {Object} Updated entry.
         */
        function set(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = targetCollection.get(id);
            const record = assignSystemProps(deepCopy(data), existing);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Modify entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Shallow merge will be performed!
         * @return {Object} Updated entry.
         */
        function merge(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = deepCopy(targetCollection.get(id));
            const record = assignClean(existing, data);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Delete entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @return {{_deletedOn: number}} Server time of deletion.
         */
        function del(collection, id) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            targetCollection.delete(id);

            return { _deletedOn: Date.now() };
        }

        /**
         * Search in collection by query object
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {Object} query Query object. Format {prop: value}.
         * @return {Object[]} Array of matching entries.
         */
        function query(collection, query) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            const result = [];
            // Iterate entries of target collection and compare each property with the given query
            for (let [key, entry] of [...targetCollection.entries()]) {
                let match = true;
                for (let prop in entry) {
                    if (query.hasOwnProperty(prop)) {
                        const targetValue = query[prop];
                        // Perform lowercase search, if value is string
                        if (typeof targetValue === 'string' && typeof entry[prop] === 'string') {
                            if (targetValue.toLocaleLowerCase() !== entry[prop].toLocaleLowerCase()) {
                                match = false;
                                break;
                            }
                        } else if (targetValue != entry[prop]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    result.push(Object.assign(deepCopy(entry), { _id: key }));
                }
            }

            return result;
        }

        return { get, add, set, merge, delete: del, query };
    }


    function assignSystemProps(target, entry, ...rest) {
        const whitelist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let prop of whitelist) {
            if (entry.hasOwnProperty(prop)) {
                target[prop] = deepCopy(entry[prop]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }


    function assignClean(target, entry, ...rest) {
        const blacklist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let key in entry) {
            if (blacklist.includes(key) == false) {
                target[key] = deepCopy(entry[key]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }

    function deepCopy(value) {
        if (Array.isArray(value)) {
            return value.map(deepCopy);
        } else if (typeof value == 'object') {
            return [...Object.entries(value)].reduce((p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }), {});
        } else {
            return value;
        }
    }

    var storage = initPlugin;

    const { ConflictError: ConflictError$1, CredentialError: CredentialError$1, RequestError: RequestError$2 } = errors;

    function initPlugin$1(settings) {
        const identity = settings.identity;

        return function decorateContext(context, request) {
            context.auth = {
                register,
                login,
                logout
            };

            const userToken = request.headers['x-authorization'];
            if (userToken !== undefined) {
                let user;
                const session = findSessionByToken(userToken);
                if (session !== undefined) {
                    const userData = context.protectedStorage.get('users', session.userId);
                    if (userData !== undefined) {
                        console.log('Authorized as ' + userData[identity]);
                        user = userData;
                    }
                }
                if (user !== undefined) {
                    context.user = user;
                } else {
                    throw new CredentialError$1('Invalid access token');
                }
            }

            function register(body) {
                if (body.hasOwnProperty(identity) === false ||
                    body.hasOwnProperty('password') === false ||
                    body[identity].length == 0 ||
                    body.password.length == 0) {
                    throw new RequestError$2('Missing fields');
                } else if (context.protectedStorage.query('users', { [identity]: body[identity] }).length !== 0) {
                    throw new ConflictError$1(`A user with the same ${identity} already exists`);
                } else {
                    const newUser = Object.assign({}, body, {
                        [identity]: body[identity],
                        hashedPassword: hash(body.password)
                    });
                    const result = context.protectedStorage.add('users', newUser);
                    delete result.hashedPassword;

                    const session = saveSession(result._id);
                    result.accessToken = session.accessToken;

                    return result;
                }
            }

            function login(body) {
                const targetUser = context.protectedStorage.query('users', { [identity]: body[identity] });
                if (targetUser.length == 1) {
                    if (hash(body.password) === targetUser[0].hashedPassword) {
                        const result = targetUser[0];
                        delete result.hashedPassword;

                        const session = saveSession(result._id);
                        result.accessToken = session.accessToken;

                        return result;
                    } else {
                        throw new CredentialError$1('Login or password don\'t match');
                    }
                } else {
                    throw new CredentialError$1('Login or password don\'t match');
                }
            }

            function logout() {
                if (context.user !== undefined) {
                    const session = findSessionByUserId(context.user._id);
                    if (session !== undefined) {
                        context.protectedStorage.delete('sessions', session._id);
                    }
                } else {
                    throw new CredentialError$1('User session does not exist');
                }
            }

            function saveSession(userId) {
                let session = context.protectedStorage.add('sessions', { userId });
                const accessToken = hash(session._id);
                session = context.protectedStorage.set('sessions', session._id, Object.assign({ accessToken }, session));
                return session;
            }

            function findSessionByToken(userToken) {
                return context.protectedStorage.query('sessions', { accessToken: userToken })[0];
            }

            function findSessionByUserId(userId) {
                return context.protectedStorage.query('sessions', { userId })[0];
            }
        };
    }


    const secret = 'This is not a production server';

    function hash(string) {
        const hash = crypto__default['default'].createHmac('sha256', secret);
        hash.update(string);
        return hash.digest('hex');
    }

    var auth = initPlugin$1;

    function initPlugin$2(settings) {
        const util = {
            throttle: false
        };

        return function decoreateContext(context, request) {
            context.util = util;
        };
    }

    var util$2 = initPlugin$2;

    /*
     * This plugin requires auth and storage plugins
     */

    const { RequestError: RequestError$3, ConflictError: ConflictError$2, CredentialError: CredentialError$2, AuthorizationError: AuthorizationError$2 } = errors;

    function initPlugin$3(settings) {
        const actions = {
            'GET': '.read',
            'POST': '.create',
            'PUT': '.update',
            'PATCH': '.update',
            'DELETE': '.delete'
        };
        const rules = Object.assign({
            '*': {
                '.create': ['User'],
                '.update': ['Owner'],
                '.delete': ['Owner']
            }
        }, settings.rules);

        return function decorateContext(context, request) {
            // special rules (evaluated at run-time)
            const get = (collectionName, id) => {
                return context.storage.get(collectionName, id);
            };
            const isOwner = (user, object) => {
                return user._id == object._ownerId;
            };
            context.rules = {
                get,
                isOwner
            };
            const isAdmin = request.headers.hasOwnProperty('x-admin');

            context.canAccess = canAccess;

            function canAccess(data, newData) {
                const user = context.user;
                const action = actions[request.method];
                let { rule, propRules } = getRule(action, context.params.collection, data);

                if (Array.isArray(rule)) {
                    rule = checkRoles(rule, data);
                } else if (typeof rule == 'string') {
                    rule = !!(eval(rule));
                }
                if (!rule && !isAdmin) {
                    throw new CredentialError$2();
                }
                propRules.map(r => applyPropRule(action, r, user, data, newData));
            }

            function applyPropRule(action, [prop, rule], user, data, newData) {
                // NOTE: user needs to be in scope for eval to work on certain rules
                if (typeof rule == 'string') {
                    rule = !!eval(rule);
                }

                if (rule == false) {
                    if (action == '.create' || action == '.update') {
                        delete newData[prop];
                    } else if (action == '.read') {
                        delete data[prop];
                    }
                }
            }

            function checkRoles(roles, data, newData) {
                if (roles.includes('Guest')) {
                    return true;
                } else if (!context.user && !isAdmin) {
                    throw new AuthorizationError$2();
                } else if (roles.includes('User')) {
                    return true;
                } else if (context.user && roles.includes('Owner')) {
                    return context.user._id == data._ownerId;
                } else {
                    return false;
                }
            }
        };



        function getRule(action, collection, data = {}) {
            let currentRule = ruleOrDefault(true, rules['*'][action]);
            let propRules = [];

            // Top-level rules for the collection
            const collectionRules = rules[collection];
            if (collectionRules !== undefined) {
                // Top-level rule for the specific action for the collection
                currentRule = ruleOrDefault(currentRule, collectionRules[action]);

                // Prop rules
                const allPropRules = collectionRules['*'];
                if (allPropRules !== undefined) {
                    propRules = ruleOrDefault(propRules, getPropRule(allPropRules, action));
                }

                // Rules by record id 
                const recordRules = collectionRules[data._id];
                if (recordRules !== undefined) {
                    currentRule = ruleOrDefault(currentRule, recordRules[action]);
                    propRules = ruleOrDefault(propRules, getPropRule(recordRules, action));
                }
            }

            return {
                rule: currentRule,
                propRules
            };
        }

        function ruleOrDefault(current, rule) {
            return (rule === undefined || rule.length === 0) ? current : rule;
        }

        function getPropRule(record, action) {
            const props = Object
                .entries(record)
                .filter(([k]) => k[0] != '.')
                .filter(([k, v]) => v.hasOwnProperty(action))
                .map(([k, v]) => [k, v[action]]);

            return props;
        }
    }

    var rules = initPlugin$3;

    var identity = "email";
    var protectedData = {
        users: {
            "35c62d76-8152-4626-8712-eeb96381bea8": {
                email: "peter@abv.bg",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            },
            "847ec027-f659-4086-8032-5173e2f9c93a": {
                email: "john@abv.bg",
                hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
            }
        },
        sessions: {
        }
    };
    var seedData = {
        
        templates: {
  "5c7d8f0e-3a9b-4c2d-9e1f-6a4b3c8d2e7a": {
    "id": "5c7d8f0e-3a9b-4c2d-9e1f-6a4b3c8d2e7a",
    "name": "Belle Atelier - Beauty & Makeup Artistry",
    "description": "Boutique makeup artistry landing page with elegant design, perfect for beauty professionals and makeup artists.",
    "thumbnail": "<section class=\"relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"absolute inset-0 opacity-10\">\n    <div class=\"absolute top-20 left-10 w-72 h-72 bg-[#b78e5c] rounded-full blur-3xl\"></div>\n    <div class=\"absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl\"></div>\n  </div>\n  <div class=\"relative z-10 text-center px-6 max-w-4xl\">\n    <div class=\"mb-8 flex justify-center\">\n      <svg class=\"w-16 h-16 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M17.5 12c0 .8-.3 1.5-.9 2-.5.5-1.2.8-2 .9v1.6c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.6c-.8-.1-1.5-.4-2-.9-.6-.5-.9-1.2-.9-2s.3-1.5.9-2c.5-.5 1.2-.8 2-.9V7.5c0-.3.2-.5.5-.5s.5.2.5.5v1.6c.8.1 1.5.4 2 .9.6.5.9 1.2.9 2zm-3.5-.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z\"/>\n      </svg>\n    </div>\n    <h1 class=\"text-6xl md:text-7xl font-light text-white mb-6 tracking-wide\">\n      Beauty is an <span class=\"italic font-serif\">Art</span>\n    </h1>\n    <p class=\"text-xl md:text-2xl text-white/90 mb-12 font-light tracking-wide max-w-2xl mx-auto leading-relaxed\">\n      Elevate your natural beauty with artistry and elegance. Boutique makeup services for your most special moments.\n    </p>\n    <div class=\"flex flex-col sm:flex-row gap-4 justify-center items-center\">\n      <button class=\"bg-[#b78e5c] text-white px-10 py-4 rounded-full hover:bg-[#a67d4e] transition-all shadow-xl hover:shadow-2xl text-lg font-light tracking-wide\">\n        Book Your Glam Session\n      </button>\n      <button class=\"bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 px-10 py-4 rounded-full hover:bg-white/30 transition-all text-lg font-light tracking-wide\">\n        View Portfolio\n      </button>\n    </div>\n  </div>\n  <div class=\"absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce\">\n    <svg class=\"w-6 h-6 text-white/60\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/>\n    </svg>\n  </div>\n</section>",
    "category": "Beauty",
    "bodyClass": "class=\"min-h-screen bg-white font-sans text-gray-800\"",
    "config": {
      "colors": {
        "primary": "#b78e5c",
        "background": "#ffffff"
      }
    },
    "sections": {
      "header": "<header class=\"fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#b78e5c]/20\">\n  <nav class=\"max-w-7xl mx-auto px-6 py-5 flex items-center justify-between\">\n    <div class=\"flex items-center gap-3\">\n      <svg class=\"w-8 h-8 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z\"/>\n      </svg>\n      <span class=\"text-2xl font-light tracking-wide text-[#b78e5c]\">Belle Atelier</span>\n    </div>\n    <div class=\"hidden md:flex items-center gap-8\">\n      <a href=\"#about\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">About</a>\n      <a href=\"#services\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">Services</a>\n      <a href=\"#gallery\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">Gallery</a>\n      <a href=\"#faq\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">FAQ</a>\n      <button class=\"bg-[#b78e5c] text-white px-6 py-2.5 rounded-full hover:bg-[#a67d4e] transition-all shadow-md hover:shadow-lg text-sm font-light tracking-wide\">\n        Book Now\n      </button>\n    </div>\n  </nav>\n</header>",
      "hero": "<section class=\"relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"absolute inset-0 opacity-10\">\n    <div class=\"absolute top-20 left-10 w-72 h-72 bg-[#b78e5c] rounded-full blur-3xl\"></div>\n    <div class=\"absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl\"></div>\n  </div>\n  <div class=\"relative z-10 text-center px-6 max-w-4xl\">\n    <div class=\"mb-8 flex justify-center\">\n      <svg class=\"w-16 h-16 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M17.5 12c0 .8-.3 1.5-.9 2-.5.5-1.2.8-2 .9v1.6c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.6c-.8-.1-1.5-.4-2-.9-.6-.5-.9-1.2-.9-2s.3-1.5.9-2c.5-.5 1.2-.8 2-.9V7.5c0-.3.2-.5.5-.5s.5.2.5.5v1.6c.8.1 1.5.4 2 .9.6.5.9 1.2.9 2zm-3.5-.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z\"/>\n      </svg>\n    </div>\n    <h1 class=\"text-6xl md:text-7xl font-light text-white mb-6 tracking-wide\">\n      Beauty is an <span class=\"italic font-serif\">Art</span>\n    </h1>\n    <p class=\"text-xl md:text-2xl text-white/90 mb-12 font-light tracking-wide max-w-2xl mx-auto leading-relaxed\">\n      Elevate your natural beauty with artistry and elegance. Boutique makeup services for your most special moments.\n    </p>\n    <div class=\"flex flex-col sm:flex-row gap-4 justify-center items-center\">\n      <button class=\"bg-[#b78e5c] text-white px-10 py-4 rounded-full hover:bg-[#a67d4e] transition-all shadow-xl hover:shadow-2xl text-lg font-light tracking-wide\">\n        Book Your Glam Session\n      </button>\n      <button class=\"bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 px-10 py-4 rounded-full hover:bg-white/30 transition-all text-lg font-light tracking-wide\">\n        View Portfolio\n      </button>\n    </div>\n  </div>\n  <div class=\"absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce\">\n    <svg class=\"w-6 h-6 text-white/60\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/>\n    </svg>\n  </div>\n</section>",
      "about": "<section id=\"about\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-6xl mx-auto\">\n    <div class=\"grid md:grid-cols-2 gap-16 items-center\">\n      <div>\n        <div class=\"inline-block mb-6\">\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">About the Artist</span>\n        </div>\n        <h2 class=\"text-5xl font-light text-gray-800 mb-8 leading-tight\">\n          Where Beauty Meets <span class=\"italic font-serif text-[#b78e5c]\">Artistry</span>\n        </h2>\n        <p class=\"text-gray-600 mb-6 leading-relaxed text-lg font-light\">\n          With over 8 years of experience in the beauty industry, I specialize in creating timeless, elegant looks that enhance your natural beauty. Each client receives personalized attention in our intimate boutique studio.\n        </p>\n        <p class=\"text-gray-600 mb-8 leading-relaxed text-lg font-light\">\n          My philosophy is simple: makeup should make you feel confident, radiant, and authentically beautiful. From soft, romantic bridal glam to sophisticated evening looks, every brushstroke is crafted with care and precision.\n        </p>\n        <div class=\"grid grid-cols-3 gap-8 pt-8 border-t border-[#b78e5c]/20\">\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">500+</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Happy Clients</div>\n          </div>\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">200+</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Weddings</div>\n          </div>\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">8</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Years Experience</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"relative\">\n        <div class=\"absolute -top-8 -left-8 w-full h-full border-2 border-[#b78e5c]/30 rounded-3xl\"></div>\n        <div class=\"relative bg-gradient-to-br from-[#ddb7b5] to-[#d8a7a7] rounded-3xl h-[600px] shadow-2xl overflow-hidden\">\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Professional Makeup Artist\" class=\"w-full h-full object-cover\" />\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "services": "<section id=\"services\" class=\"py-32 px-6 bg-gradient-to-br from-[#f5f5f5] to-[#faf8f7]\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">Services</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Signature <span class=\"italic font-serif text-[#b78e5c]\">Services</span>\n      </h2>\n      <p class=\"text-gray-600 text-lg font-light max-w-2xl mx-auto leading-relaxed\">\n        Bespoke makeup artistry tailored to your unique style and occasion\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-8\">\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Bridal Glam</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Perfect wedding day makeup that lasts from ceremony to reception</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $250</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Special Events</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Red carpet ready looks for galas, photoshoots, and celebrations</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $150</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Soft Glam</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Everyday elegance with a touch of sophistication</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $120</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Private Sessions</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">One-on-one makeup lessons and beauty consultations</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $180</span>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "gallery": "<section id=\"gallery\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">Portfolio</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Before & <span class=\"italic font-serif text-[#b78e5c]\">After</span>\n      </h2>\n      <p class=\"text-gray-600 text-lg font-light max-w-2xl mx-auto leading-relaxed\">\n        Witness the transformative power of artistry and elegance\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-6\">\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 1\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Natural Glow</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Everyday</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 2\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Bridal Elegance</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Wedding</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 3\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Evening Glam</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Event</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 4\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Soft Romance</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Engagement</span>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "testimonials": "<section class=\"py-32 px-6 bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"max-w-6xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-white/90 text-sm font-light tracking-[0.3em] uppercase border-b border-white/40 pb-2\">Testimonials</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-white mb-6\">\n        What Clients <span class=\"italic font-serif\">Say</span>\n      </h2>\n    </div>\n    <div class=\"grid md:grid-cols-3 gap-8\">\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"Absolutely stunning! She made me feel like a goddess on my wedding day.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Sofia M.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Sofia M.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Bride</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"The most talented makeup artist I have ever worked with. Pure artistry.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Elena K.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Elena K.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Model</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"Professional, warm, and incredibly skilled. I felt beautiful and confident.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Maria P.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Maria P.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Client</div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "faq": "<section id=\"faq\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-4xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">FAQ</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Frequently Asked <span class=\"italic font-serif text-[#b78e5c]\">Questions</span>\n      </h2>\n    </div>\n    <div class=\"space-y-4\" id=\"faq-container\">\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">How far in advance should I book?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">For bridal services, we recommend booking 3-6 months in advance. For other services, 2-4 weeks notice is ideal.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">Do you provide a trial session?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">Yes! Bridal packages include a complimentary trial session to ensure your vision comes to life perfectly.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">What products do you use?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">We use only premium, professional-grade products from brands like Charlotte Tilbury, Tom Ford, and Pat McGrath.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">Do you travel for appointments?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">Absolutely! We offer on-location services for weddings and special events. Travel fees may apply.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">What is your cancellation policy?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">48-hour notice required for cancellations. Deposits are non-refundable but can be transferred to future bookings.</p>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "footer": "<footer class=\"bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] pt-20 pb-12 px-6\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid md:grid-cols-4 gap-12 mb-16\">\n      <div class=\"md:col-span-2\">\n        <div class=\"flex items-center gap-3 mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z\"/>\n          </svg>\n          <span class=\"text-3xl font-light tracking-wide text-white\">Belle Atelier</span>\n        </div>\n        <p class=\"text-white/80 font-light leading-relaxed mb-6 max-w-md\">\n          Boutique makeup artistry studio specializing in bridal, special events, and personalized beauty services. Creating timeless elegance, one face at a time.\n        </p>\n        <div class=\"flex gap-4\">\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"/>\n            </svg>\n          </a>\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z\"/>\n            </svg>\n          </a>\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z\"/>\n            </svg>\n          </a>\n        </div>\n      </div>\n      <div>\n        <h3 class=\"text-white text-lg font-light mb-6 tracking-wide\">Quick Links</h3>\n        <ul class=\"space-y-3\">\n          <li><a href=\"#about\" class=\"text-white/80 hover:text-white transition-colors font-light\">About</a></li>\n          <li><a href=\"#services\" class=\"text-white/80 hover:text-white transition-colors font-light\">Services</a></li>\n          <li><a href=\"#gallery\" class=\"text-white/80 hover:text-white transition-colors font-light\">Portfolio</a></li>\n          <li><a href=\"#faq\" class=\"text-white/80 hover:text-white transition-colors font-light\">FAQ</a></li>\n        </ul>\n      </div>\n      <div>\n        <h3 class=\"text-white text-lg font-light mb-6 tracking-wide\">Contact</h3>\n        <ul class=\"space-y-4\">\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">123 Beauty Lane, Sofia, Bulgaria</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">hello@belleatelier.com</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">+359 888 123 456</span>\n          </li>\n        </ul>\n      </div>\n    </div>\n    <div class=\"pt-8 border-t border-[#b78e5c]/30\">\n      <div class=\"flex flex-col md:flex-row justify-between items-center gap-4\">\n        <p class=\"text-white/70 font-light text-sm\">В© 2024 Belle Atelier. All rights reserved.</p>\n        <div class=\"flex gap-6\">\n          <a href=\"#\" class=\"text-white/70 hover:text-white text-sm font-light transition-colors\">Privacy Policy</a>\n          <a href=\"#\" class=\"text-white/70 hover:text-white text-sm font-light transition-colors\">Terms of Service</a>\n        </div>\n      </div>\n    </div>\n  </div>\n</footer>",
      "javascript": "<script>\n  document.addEventListener('DOMContentLoaded', () => {\n    const buttons = document.querySelectorAll('.faq-btn');\n    const answers = document.querySelectorAll('.faq-answer');\n    const icons = document.querySelectorAll('.faq-icon');\n    buttons.forEach((button, index) => {\n      button.addEventListener('click', () => {\n        const answer = answers[index];\n        const icon = icons[index];\n        const isCurrentlyOpen = !answer.classList.contains('hidden');\n        answers.forEach(a => a.classList.add('hidden'));\n        icons.forEach(i => i.classList.remove('rotate-180'));\n        if (!isCurrentlyOpen) {\n          answer.classList.remove('hidden');\n          icon.classList.add('rotate-180');\n        }\n      });\n    });\n  });\n</script>"
    },
    "full_html_template": "<!DOCTYPE html>\n<html lang=\"en\" class=\"scroll-smooth\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-width=1.0\">\n  <title>Belle Atelier | Beauty & Makeup Artistry</title>\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n</head>\n <body class=\"min-h-screen bg-white font-sans text-gray-800\">\n  <header class=\"fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#b78e5c]/20\">\n  <nav class=\"max-w-7xl mx-auto px-6 py-5 flex items-center justify-between\">\n    <div class=\"flex items-center gap-3\">\n      <svg class=\"w-8 h-8 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z\"/>\n      </svg>\n      <span class=\"text-2xl font-light tracking-wide text-[#b78e5c]\">Belle Atelier</span>\n    </div>\n    <div class=\"hidden md:flex items-center gap-8\">\n      <a href=\"#about\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">About</a>\n      <a href=\"#services\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">Services</a>\n      <a href=\"#gallery\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">Gallery</a>\n      <a href=\"#faq\" class=\"text-gray-700 hover:text-[#b78e5c] transition-colors text-sm font-light tracking-wide\">FAQ</a>\n      <button class=\"bg-[#b78e5c] text-white px-6 py-2.5 rounded-full hover:bg-[#a67d4e] transition-all shadow-md hover:shadow-lg text-sm font-light tracking-wide\">\n        Book Now\n      </button>\n    </div>\n  </nav>\n</header>\n  <section class=\"relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"absolute inset-0 opacity-10\">\n    <div class=\"absolute top-20 left-10 w-72 h-72 bg-[#b78e5c] rounded-full blur-3xl\"></div>\n    <div class=\"absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl\"></div>\n  </div>\n  <div class=\"relative z-10 text-center px-6 max-w-4xl\">\n    <div class=\"mb-8 flex justify-center\">\n      <svg class=\"w-16 h-16 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M17.5 12c0 .8-.3 1.5-.9 2-.5.5-1.2.8-2 .9v1.6c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.6c-.8-.1-1.5-.4-2-.9-.6-.5-.9-1.2-.9-2s.3-1.5.9-2c.5-.5 1.2-.8 2-.9V7.5c0-.3.2-.5.5-.5s.5.2.5.5v1.6c.8.1 1.5.4 2 .9.6.5.9 1.2.9 2zm-3.5-.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z\"/>\n      </svg>\n    </div>\n    <h1 class=\"text-6xl md:text-7xl font-light text-white mb-6 tracking-wide\">\n      Beauty is an <span class=\"italic font-serif\">Art</span>\n    </h1>\n    <p class=\"text-xl md:text-2xl text-white/90 mb-12 font-light tracking-wide max-w-2xl mx-auto leading-relaxed\">\n      Elevate your natural beauty with artistry and elegance. Boutique makeup services for your most special moments.\n    </p>\n    <div class=\"flex flex-col sm:flex-row gap-4 justify-center items-center\">\n      <button class=\"bg-[#b78e5c] text-white px-10 py-4 rounded-full hover:bg-[#a67d4e] transition-all shadow-xl hover:shadow-2xl text-lg font-light tracking-wide\">\n        Book Your Glam Session\n      </button>\n      <button class=\"bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 px-10 py-4 rounded-full hover:bg-white/30 transition-all text-lg font-light tracking-wide\">\n        View Portfolio\n      </button>\n    </div>\n  </div>\n  <div class=\"absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce\">\n    <svg class=\"w-6 h-6 text-white/60\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/>\n    </svg>\n  </div>\n</section>\n  <section id=\"about\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-6xl mx-auto\">\n    <div class=\"grid md:grid-cols-2 gap-16 items-center\">\n      <div>\n        <div class=\"inline-block mb-6\">\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">About the Artist</span>\n        </div>\n        <h2 class=\"text-5xl font-light text-gray-800 mb-8 leading-tight\">\n          Where Beauty Meets <span class=\"italic font-serif text-[#b78e5c]\">Artistry</span>\n        </h2>\n        <p class=\"text-gray-600 mb-6 leading-relaxed text-lg font-light\">\n          With over 8 years of experience in the beauty industry, I specialize in creating timeless, elegant looks that enhance your natural beauty. Each client receives personalized attention in our intimate boutique studio.\n        </p>\n        <p class=\"text-gray-600 mb-8 leading-relaxed text-lg font-light\">\n          My philosophy is simple: makeup should make you feel confident, radiant, and authentically beautiful. From soft, romantic bridal glam to sophisticated evening looks, every brushstroke is crafted with care and precision.\n        </p>\n        <div class=\"grid grid-cols-3 gap-8 pt-8 border-t border-[#b78e5c]/20\">\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">500+</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Happy Clients</div>\n          </div>\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">200+</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Weddings</div>\n          </div>\n          <div>\n            <div class=\"text-4xl font-light text-[#b78e5c] mb-2\">8</div>\n            <div class=\"text-sm text-gray-600 font-light tracking-wide\">Years Experience</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"relative\">\n        <div class=\"absolute -top-8 -left-8 w-full h-full border-2 border-[#b78e5c]/30 rounded-3xl\"></div>\n        <div class=\"relative bg-gradient-to-br from-[#ddb7b5] to-[#d8a7a7] rounded-3xl h-[600px] shadow-2xl overflow-hidden\">\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Professional Makeup Artist\" class=\"w-full h-full object-cover\" />\n        </div>\n      </div>\n    </div>\n  </div>\n</section>\n  <section id=\"services\" class=\"py-32 px-6 bg-gradient-to-br from-[#f5f5f5] to-[#faf8f7]\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">Services</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Signature <span class=\"italic font-serif text-[#b78e5c]\">Services</span>\n      </h2>\n      <p class=\"text-gray-600 text-lg font-light max-w-2xl mx-auto leading-relaxed\">\n        Bespoke makeup artistry tailored to your unique style and occasion\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-8\">\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Bridal Glam</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Perfect wedding day makeup that lasts from ceremony to reception</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $250</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Special Events</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Red carpet ready looks for galas, photoshoots, and celebrations</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $150</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Soft Glam</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">Everyday elegance with a touch of sophistication</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $120</span>\n        </div>\n      </div>\n      <div class=\"bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#b78e5c]/10 hover:border-[#b78e5c]/30 group\">\n        <div class=\"mb-6\">\n          <div class=\"w-14 h-14 bg-gradient-to-br from-[#ddb7b5] to-[#b78e5c] rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform\">\n            <svg class=\"w-7 h-7 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\"/>\n            </svg>\n          </div>\n        </div>\n        <h3 class=\"text-2xl font-light text-gray-800 mb-3\">Private Sessions</h3>\n        <p class=\"text-gray-600 mb-6 leading-relaxed font-light\">One-on-one makeup lessons and beauty consultations</p>\n        <div class=\"pt-4 border-t border-[#b78e5c]/20\">\n          <span class=\"text-[#b78e5c] font-light text-lg\">From $180</span>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>\n  <section id=\"gallery\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">Portfolio</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Before & <span class=\"italic font-serif text-[#b78e5c]\">After</span>\n      </h2>\n      <p class=\"text-gray-600 text-lg font-light max-w-2xl mx-auto leading-relaxed\">\n        Witness the transformative power of artistry and elegance\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-6\">\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 1\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Natural Glow</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Everyday</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 2\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Bridal Elegance</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Wedding</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 3\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Evening Glam</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Event</span>\n        </div>\n      </div>\n      <div class=\"group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300\">\n        <div class=\"aspect-[3/4] bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] flex items-center justify-center relative\">\n          <div class=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300\"></div>\n          <img src=\"https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Makeup Portfolio 4\" class=\"w-full h-full object-cover\" />\n        </div>\n        <div class=\"absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent\">\n          <h3 class=\"text-white text-xl font-light mb-1\">Soft Romance</h3>\n          <span class=\"text-[#b78e5c] text-sm font-light tracking-wide\">Engagement</span>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>\n  <section class=\"py-32 px-6 bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"max-w-6xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-white/90 text-sm font-light tracking-[0.3em] uppercase border-b border-white/40 pb-2\">Testimonials</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-white mb-6\">\n        What Clients <span class=\"italic font-serif\">Say</span>\n      </h2>\n    </div>\n    <div class=\"grid md:grid-cols-3 gap-8\">\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"Absolutely stunning! She made me feel like a goddess on my wedding day.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Sofia M.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Sofia M.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Bride</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"The most talented makeup artist I have ever worked with. Pure artistry.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Elena K.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Elena K.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Model</div>\n          </div>\n        </div>\n      </div>\n      <div class=\"bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border-2 border-[#b78e5c]/20\">\n        <div class=\"mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]/30\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z\"/>\n          </svg>\n        </div>\n        <p class=\"text-gray-700 mb-6 leading-relaxed font-light text-lg\">\"Professional, warm, and incredibly skilled. I felt beautiful and confident.\"</p>\n        <div class=\"flex items-center gap-3 pt-4 border-t border-[#b78e5c]/20\">\n          <img src=\"https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=100\" alt=\"Maria P.\" class=\"w-12 h-12 rounded-full object-cover\" />\n          <div>\n            <div class=\"font-light text-gray-800\">Maria P.</div>\n            <div class=\"text-sm text-[#b78e5c] font-light\">Client</div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>\n  <section id=\"faq\" class=\"py-32 px-6 bg-white\">\n  <div class=\"max-w-4xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <div class=\"inline-block mb-6\">\n        <span class=\"text-[#b78e5c] text-sm font-light tracking-[0.3em] uppercase border-b border-[#b78e5c] pb-2\">FAQ</span>\n      </div>\n      <h2 class=\"text-5xl font-light text-gray-800 mb-6\">\n        Frequently Asked <span class=\"italic font-serif text-[#b78e5c]\">Questions</span>\n      </h2>\n    </div>\n    <div class=\"space-y-4\" id=\"faq-container\">\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">How far in advance should I book?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">For bridal services, we recommend booking 3-6 months in advance. For other services, 2-4 weeks notice is ideal.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">Do you provide a trial session?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">Yes! Bridal packages include a complimentary trial session to ensure your vision comes to life perfectly.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">What products do you use?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">We use only premium, professional-grade products from brands like Charlotte Tilbury, Tom Ford, and Pat McGrath.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">Do you travel for appointments?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">Absolutely! We offer on-location services for weddings and special events. Travel fees may apply.</p>\n        </div>\n      </div>\n      <div class=\"border-2 border-[#b78e5c]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#b78e5c]/40\">\n        <button class=\"w-full px-8 py-6 flex items-center justify-between text-left bg-white hover:bg-[#faf8f7] transition-colors faq-btn\">\n          <span class=\"text-lg font-light text-gray-800 pr-4\">What is your cancellation policy?</span>\n          <svg class=\"w-6 h-6 text-[#b78e5c] flex-shrink-0 transition-transform faq-icon\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\" />\n          </svg>\n        </button>\n        <div class=\"hidden px-8 py-6 bg-gradient-to-br from-[#faf8f7] to-white border-t border-[#b78e5c]/10 faq-answer\">\n          <p class=\"text-gray-600 leading-relaxed font-light\">48-hour notice required for cancellations. Deposits are non-refundable but can be transferred to future bookings.</p>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>\n  <footer class=\"bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595] pt-20 pb-12 px-6\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid md:grid-cols-4 gap-12 mb-16\">\n      <div class=\"md:col-span-2\">\n        <div class=\"flex items-center gap-3 mb-6\">\n          <svg class=\"w-10 h-10 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z\"/>\n          </svg>\n          <span class=\"text-3xl font-light tracking-wide text-white\">Belle Atelier</span>\n        </div>\n        <p class=\"text-white/80 font-light leading-relaxed mb-6 max-w-md\">\n          Boutique makeup artistry studio specializing in bridal, special events, and personalized beauty services. Creating timeless elegance, one face at a time.\n        </p>\n        <div class=\"flex gap-4\">\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"/>\n            </svg>\n          </a>\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z\"/>\n            </svg>\n          </a>\n          <a href=\"#\" class=\"w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-[#b78e5c] transition-all group\">\n            <svg class=\"w-5 h-5 text-white\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z\"/>\n            </svg>\n          </a>\n        </div>\n      </div>\n      <div>\n        <h3 class=\"text-white text-lg font-light mb-6 tracking-wide\">Quick Links</h3>\n        <ul class=\"space-y-3\">\n          <li><a href=\"#about\" class=\"text-white/80 hover:text-white transition-colors font-light\">About</a></li>\n          <li><a href=\"#services\" class=\"text-white/80 hover:text-white transition-colors font-light\">Services</a></li>\n          <li><a href=\"#gallery\" class=\"text-white/80 hover:text-white transition-colors font-light\">Portfolio</a></li>\n          <li><a href=\"#faq\" class=\"text-white/80 hover:text-white transition-colors font-light\">FAQ</a></li>\n        </ul>\n      </div>\n      <div>\n        <h3 class=\"text-white text-lg font-light mb-6 tracking-wide\">Contact</h3>\n        <ul class=\"space-y-4\">\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">123 Beauty Lane, Sofia, Bulgaria</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">hello@belleatelier.com</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-5 h-5 text-[#b78e5c] mt-0.5 flex-shrink-0\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z\"/>\n            </svg>\n            <span class=\"text-white/80 font-light\">+359 888 123 456</span>\n          </li>\n        </ul>\n      </div>\n    </div>\n    <div class=\"pt-8 border-t border-[#b78e5c]/30\">\n      <div class=\"flex flex-col md:flex-row justify-between items-center gap-4\">\n        <p class=\"text-white/70 font-light text-sm\">В© 2024 Belle Atelier. All rights reserved.</p>\n        <div class=\"flex gap-6\">\n          <a href=\"#\" class=\"text-white/70 hover:text-white text-sm font-light transition-colors\">Privacy Policy</a>\n          <a href=\"#\" class=\"text-white/70 hover:text-white text-sm font-light transition-colors\">Terms of Service</a>\n        </div>\n      </div>\n    </div>\n  </div>\n</footer>\n  <script>\n  document.addEventListener('DOMContentLoaded', () => {\n    const buttons = document.querySelectorAll('.faq-btn');\n    const answers = document.querySelectorAll('.faq-answer');\n    const icons = document.querySelectorAll('.faq-icon');\n    buttons.forEach((button, index) => {\n      button.addEventListener('click', () => {\n        const answer = answers[index];\n        const icon = icons[index];\n        const isCurrentlyOpen = !answer.classList.contains('hidden');\n        answers.forEach(a => a.classList.add('hidden'));\n        icons.forEach(i => i.classList.remove('rotate-180'));\n        if (!isCurrentlyOpen) {\n          answer.classList.remove('hidden');\n          icon.classList.add('rotate-180');\n        }\n      });\n    });\n  });\n</script>\n</body>\n</html>"
  },
  "7b9a2c4f-1d5e-4b6c-8a3d-2f1e0g3h4i5j": {
    "id": "7b9a2c4f-1d5e-4b6c-8a3d-2f1e0g3h4i5j",
    "name": "CryptoVault - Digital Finance Platform",
    "description": "Modern cryptocurrency trading platform with futuristic design, perfect for crypto and fintech businesses.",
    "thumbnail": "<section class=\"relative pt-32 pb-24 px-6 overflow-hidden\">\n  <div class=\"absolute inset-0 overflow-hidden\">\n    <div class=\"absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse\"></div>\n    <div class=\"absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse\"></div>\n  </div>\n  <div class=\"container mx-auto text-center relative z-10\">\n    <div class=\"max-w-4xl mx-auto space-y-12\">\n      <div class=\"inline-block px-6 py-2 bg-blue-500/10 border border-blue-400/30 rounded-full text-blue-400 text-sm mb-8\">\n        The Future of Digital Finance\n      </div>\n      <h1 class=\"text-6xl md:text-7xl lg:text-8xl font-bold leading-tight\">\n        <span>Trade Crypto</span>\n        <br/>\n        <span class=\"bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent\">\n          Like Never Before\n        </span>\n      </h1>\n      <p class=\"text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed\">\n        Experience the next generation of cryptocurrency trading with AI-powered insights, secure wallets, and seamless NFT integration\n      </p>\n      <div class=\"flex flex-col sm:flex-row items-center justify-center gap-6 pt-8\">\n        <button class=\"px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105\">\n          Get Started Free\n        </button>\n        <button class=\"px-10 py-4 border border-blue-400/30 rounded-lg text-lg font-semibold hover:bg-blue-500/10 transition-all\">\n          View Demo\n        </button>\n      </div>\n      <div class=\"grid grid-cols-2 md:grid-cols-4 gap-8 pt-20\">\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">$2.4B</div>\n          <div class=\"text-gray-400\">Trading Volume</div>\n          <div class=\"text-green-400 text-sm\">+24%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.2s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">850K+</div>\n          <div class=\"text-gray-400\">Active Users</div>\n          <div class=\"text-green-400 text-sm\">+12%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.4s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">150+</div>\n          <div class=\"text-gray-400\">Cryptocurrencies</div>\n          <div class=\"text-green-400 text-sm\">+8%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.6s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">99.9%</div>\n          <div class=\"text-gray-400\">Uptime</div>\n          <div class=\"text-green-400 text-sm\">Stable</div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
    "category": "Crypto",
    "bodyClass": "class=\"min-h-screen bg-gray-900 text-white overflow-x-hidden\"",
    "config": {
      "colors": {
        "primary": "#60a5fa",
        "secondary": "#9333ea",
        "background": "#111827"
      }
    },
    "sections": {
      "header": "<header class=\"fixed top-0 w-full z-50 backdrop-blur-lg bg-gray-900/80 border-b border-blue-500/20\">\n  <nav class=\"container mx-auto px-6 py-6\">\n    <div class=\"flex items-center justify-between\">\n      <div class=\"flex items-center space-x-3\">\n        <div class=\"w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center\">\n          <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path d=\"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\"/>\n          </svg>\n        </div>\n        <span class=\"text-2xl font-bold\">CryptoVault</span>\n      </div>\n      <div class=\"hidden md:flex items-center space-x-8\">\n        <a href=\"#features\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">Features</a>\n        <a href=\"#about\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">About</a>\n        <a href=\"#faq\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">FAQ</a>\n        <button class=\"px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all\">\n          Launch App\n        </button>\n      </div>\n    </div>\n  </nav>\n</header>",
      "hero": "<section class=\"relative pt-32 pb-24 px-6 overflow-hidden\">\n  <div class=\"absolute inset-0 overflow-hidden\">\n    <div class=\"absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse\"></div>\n    <div class=\"absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse\"></div>\n  </div>\n  <div class=\"container mx-auto text-center relative z-10\">\n    <div class=\"max-w-4xl mx-auto space-y-12\">\n      <div class=\"inline-block px-6 py-2 bg-blue-500/10 border border-blue-400/30 rounded-full text-blue-400 text-sm mb-8\">\n        The Future of Digital Finance\n      </div>\n      <h1 class=\"text-6xl md:text-7xl lg:text-8xl font-bold leading-tight\">\n        <span>Trade Crypto</span>\n        <br/>\n        <span class=\"bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent\">\n          Like Never Before\n        </span>\n      </h1>\n      <p class=\"text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed\">\n        Experience the next generation of cryptocurrency trading with AI-powered insights, secure wallets, and seamless NFT integration\n      </p>\n      <div class=\"flex flex-col sm:flex-row items-center justify-center gap-6 pt-8\">\n        <button class=\"px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105\">\n          Get Started Free\n        </button>\n        <button class=\"px-10 py-4 border border-blue-400/30 rounded-lg text-lg font-semibold hover:bg-blue-500/10 transition-all\">\n          View Demo\n        </button>\n      </div>\n      <div class=\"grid grid-cols-2 md:grid-cols-4 gap-8 pt-20\">\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">$2.4B</div>\n          <div class=\"text-gray-400\">Trading Volume</div>\n          <div class=\"text-green-400 text-sm\">+24%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.2s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">850K+</div>\n          <div class=\"text-gray-400\">Active Users</div>\n          <div class=\"text-green-400 text-sm\">+12%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.4s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">150+</div>\n          <div class=\"text-gray-400\">Cryptocurrencies</div>\n          <div class=\"text-green-400 text-sm\">+8%</div>\n        </div>\n        <div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.6s;\">\n          <div class=\"text-4xl md:text-5xl font-bold\">99.9%</div>\n          <div class=\"text-gray-400\">Uptime</div>\n          <div class=\"text-green-400 text-sm\">Stable</div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "features": "<section id=\"features\" class=\"py-32 px-6 relative\">\n  <div class=\"container mx-auto\">\n    <div class=\"text-center mb-20 space-y-6\">\n      <h2 class=\"text-5xl md:text-6xl font-bold\">Powerful Features</h2>\n      <p class=\"text-xl text-gray-400 max-w-2xl mx-auto\">\n        Everything you need to manage, trade, and grow your crypto portfolio\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto\">\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">Secure Wallet</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Military-grade encryption protects your digital assets 24/7</p>\n      </div>\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 10V3L4 14h7v7l9-11h-7z\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">Instant Trading</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Execute trades in milliseconds with zero downtime</p>\n      </div>\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">AI Analytics</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Smart insights powered by advanced machine learning</p>\n      </div>\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">NFT Marketplace</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Discover, collect, and trade unique digital collectibles</p>\n      </div>\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">Multi-Chain</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Support for Ethereum, Solana, Polygon, and more</p>\n      </div>\n      <div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n        <div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n          <svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n          </svg>\n        </div>\n        <h3 class=\"text-2xl font-bold mb-4 text-white\">DeFi Integration</h3>\n        <p class=\"text-gray-400 leading-relaxed\">Access lending, staking, and yield farming protocols</p>\n      </div>\n    </div>\n  </div>\n</section>",
      "about": "<section id=\"about\" class=\"py-32 px-6 relative\">\n  <div class=\"container mx-auto max-w-6xl\">\n    <div class=\"grid md:grid-cols-2 gap-16 items-center\">\n      <div class=\"space-y-8\">\n        <h2 class=\"text-5xl md:text-6xl font-bold leading-tight\">\n          Built for the Future of Finance\n        </h2>\n        <p class=\"text-xl text-gray-400 leading-relaxed\">\n          CryptoVault combines cutting-edge technology with user-friendly design to deliver the ultimate crypto trading experience. Our platform leverages AI and machine learning to provide real-time insights and automated trading strategies.\n        </p>\n        <div class=\"space-y-6\">\n          <div class=\"flex items-start space-x-4\">\n            <div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n              <svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n                <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n              </svg>\n            </div>\n            <div>\n              <h4 class=\"text-lg font-semibold mb-2\">Bank-Grade Security</h4>\n              <p class=\"text-gray-400\">Multi-layer protection with cold storage and insurance coverage</p>\n            </div>\n          </div>\n          <div class=\"flex items-start space-x-4\">\n            <div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n              <svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n                <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n              </svg>\n            </div>\n            <div>\n              <h4 class=\"text-lg font-semibold mb-2\">Lightning Fast</h4>\n              <p class=\"text-gray-400\">Execute trades in milliseconds with our optimized infrastructure</p>\n            </div>\n          </div>\n          <div class=\"flex items-start space-x-4\">\n            <div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n              <svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n                <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n              </svg>\n            </div>\n            <div>\n              <h4 class=\"text-lg font-semibold mb-2\">24/7 Support</h4>\n              <p class=\"text-gray-400\">Expert team available around the clock to assist you</p>\n            </div>\n          </div>\n        </div>\n      </div>\n      <div class=\"relative\">\n        <div class=\"absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl\"></div>\n        <div class=\"relative p-8 bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-blue-500/30 space-y-6\">\n          <div class=\"text-center space-y-4 pb-6 border-b border-blue-500/20\">\n            <div class=\"text-5xl font-bold\">$156,843</div>\n            <div class=\"text-gray-400\">Average Portfolio Value</div>\n            <div class=\"text-green-400 text-lg\">+32.5% This Month</div>\n          </div>\n          <div class=\"space-y-4\">\n            <div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n              <span class=\"text-gray-400\">Bitcoin</span>\n              <span class=\"font-semibold text-green-400\">+5.2%</span>\n            </div>\n            <div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n              <span class=\"text-gray-400\">Ethereum</span>\n              <span class=\"font-semibold text-green-400\">+8.7%</span>\n            </div>\n            <div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n              <span class=\"text-gray-400\">Solana</span>\n              <span class=\"font-semibold text-green-400\">+12.3%</span>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "faq": "<section id=\"faq\" class=\"py-32 px-6 relative\">\n  <div class=\"container mx-auto max-w-4xl\">\n    <div class=\"text-center mb-20 space-y-6\">\n      <h2 class=\"text-5xl md:text-6xl font-bold\">Frequently Asked Questions</h2>\n      <p class=\"text-xl text-gray-400\">\n        Everything you need to know about our platform\n      </p>\n    </div>\n    <div class=\"space-y-6\">\n      <div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n        <div class=\"flex items-center justify-between faq-btn\">\n          <h3 class=\"text-xl font-semibold text-white pr-4\">How secure is your platform?</h3>\n          <div class=\"text-blue-400 transform transition-transform faq-icon\">\n            <svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n            </svg>\n          </div>\n        </div>\n        <div class=\"faq-answer\">\n          <p class=\"text-gray-400 leading-relaxed\">We use bank-level encryption, multi-signature wallets, and cold storage for the majority of assets. Our platform undergoes regular security audits by third-party firms.</p>\n        </div>\n      </div>\n      <div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n        <div class=\"flex items-center justify-between faq-btn\">\n          <h3 class=\"text-xl font-semibold text-white pr-4\">What cryptocurrencies can I trade?</h3>\n          <div class=\"text-blue-400 transform transition-transform faq-icon\">\n            <svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n            </svg>\n          </div>\n        </div>\n        <div class=\"faq-answer\">\n          <p class=\"text-gray-400 leading-relaxed\">We support over 150 cryptocurrencies including Bitcoin, Ethereum, Solana, Cardano, Polygon, and all major DeFi tokens.</p>\n        </div>\n      </div>\n      <div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n        <div class=\"flex items-center justify-between faq-btn\">\n          <h3 class=\"text-xl font-semibold text-white pr-4\">How do I start trading NFTs?</h3>\n          <div class=\"text-blue-400 transform transition-transform faq-icon\">\n            <svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n            </svg>\n          </div>\n        </div>\n        <div class=\"faq-answer\">\n          <p class=\"text-gray-400 leading-relaxed\">Simply connect your wallet, browse our marketplace, and make your first purchase. All NFTs are verified and stored securely on the blockchain.</p>\n        </div>\n      </div>\n      <div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n        <div class=\"flex items-center justify-between faq-btn\">\n          <h3 class=\"text-xl font-semibold text-white pr-4\">Are there any trading fees?</h3>\n          <div class=\"text-blue-400 transform transition-transform faq-icon\">\n            <svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n            </svg>\n          </div>\n        </div>\n        <div class=\"faq-answer\">\n          <p class=\"text-gray-400 leading-relaxed\">We offer competitive fees starting at 0.1% for spot trading. Volume-based discounts are available for active traders.</p>\n        </div>\n      </div>\n      <div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n        <div class=\"flex items-center justify-between faq-btn\">\n          <h3 class=\"text-xl font-semibold text-white pr-4\">Can I stake my crypto?</h3>\n          <div class=\"text-blue-400 transform transition-transform faq-icon\">\n            <svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n            </svg>\n          </div>\n        </div>\n        <div class=\"faq-answer\">\n          <p class=\"text-gray-400 leading-relaxed\">Yes! We offer staking for multiple cryptocurrencies with competitive APY rates. Earn passive income while holding your assets.</p>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "cta": "<section class=\"py-32 px-6 relative\">\n  <div class=\"absolute inset-0 overflow-hidden\">\n    <div class=\"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl\"></div>\n  </div>\n  <div class=\"container mx-auto max-w-4xl text-center relative z-10\">\n    <div class=\"p-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl border border-blue-500/30 space-y-8\">\n      <h2 class=\"text-5xl md:text-6xl font-bold\">Start Trading Today</h2>\n      <p class=\"text-xl text-gray-400 max-w-2xl mx-auto\">\n        Join over 850,000 users who trust CryptoVault with their digital assets\n      </p>\n      <div class=\"flex flex-col sm:flex-row items-center justify-center gap-6 pt-8\">\n        <button class=\"px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105\">\n          Create Free Account\n        </button>\n        <button class=\"px-10 py-4 border border-blue-400/30 rounded-lg text-lg font-semibold hover:bg-blue-500/10 transition-all\">\n          Contact Sales\n        </button>\n      </div>\n    </div>\n  </div>\n</section>",
      "footer": "<footer class=\"border-t border-blue-500/20 py-16 px-6\">\n  <div class=\"container mx-auto\">\n    <div class=\"grid md:grid-cols-4 gap-12 mb-12\">\n      <div class=\"space-y-4\">\n        <div class=\"flex items-center space-x-3\">\n          <div class=\"w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center\">\n            <svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n              <path d=\"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\" />\n            </svg>\n          </div>\n          <span class=\"text-xl font-bold\">CryptoVault</span>\n        </div>\n        <p class=\"text-gray-400\">\n          The future of digital finance, powered by blockchain technology.\n        </p>\n      </div>\n      <div>\n        <h4 class=\"text-lg font-semibold mb-4\">Product</h4>\n        <ul class=\"space-y-2 text-gray-400\">\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Features</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Pricing</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Security</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Roadmap</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4 class=\"text-lg font-semibold mb-4\">Company</h4>\n        <ul class=\"space-y-2 text-gray-400\">\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">About</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Blog</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Careers</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Press</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4 class=\"text-lg font-semibold mb-4\">Support</h4>\n        <ul class=\"space-y-2 text-gray-400\">\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Help Center</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Contact</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">API Docs</a></li>\n          <li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Status</a></li>\n        </ul>\n      </div>\n    </div>\n    <div class=\"pt-8 border-t border-blue-500/20 flex flex-col md:flex-row items-center justify-between text-gray-400\">\n      <p>В© 2024 CryptoVault. All rights reserved.</p>\n      <div class=\"flex items-center space-x-6 mt-4 md:mt-0\">\n        <a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Privacy</a>\n        <a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Terms</a>\n        <a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Cookies</a>\n      </div>\n    </div>\n  </div>\n</footer>",
      "javascript": "<script>\n  document.addEventListener('DOMContentLoaded', () => {\n    const faqItems = document.querySelectorAll('.faq-item');\n    let activeIndex = null;\n    faqItems.forEach((item, index) => {\n      const button = item.querySelector('.faq-btn');\n      const answer = item.querySelector('.faq-answer');\n      const icon = item.querySelector('.faq-icon');\n      button.addEventListener('click', () => {\n        const isCurrentlyOpen = answer.classList.contains('open');\n        if (activeIndex !== null && activeIndex !== index) {\n          const prevItem = faqItems[activeIndex];\n          const prevAnswer = prevItem.querySelector('.faq-answer');\n          const prevIcon = prevItem.querySelector('.faq-icon');\n          prevAnswer.classList.remove('open');\n          prevIcon.classList.remove('rotate-45');\n        }\n        if (!isCurrentlyOpen) {\n          answer.classList.add('open');\n          icon.classList.add('rotate-45');\n          activeIndex = index;\n        } else {\n          answer.classList.remove('open');\n          icon.classList.remove('rotate-45');\n          activeIndex = null;\n        }\n      });\n    });\n  });\n</script>"
    },
    "full_html_template": "<!DOCTYPE html>\n<html lang=\"en\" class=\"scroll-smooth\">\n<head>\n \t<meta charset=\"UTF-8\">\n \t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n \t<title>CryptoVault | The Future of Digital Finance</title>\n \t<script src=\"https://cdn.tailwindcss.com\"></script>\n \t<style>\n \t\t@keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }\n \t\t@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }\n \t\t.faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.5s ease-out, padding 0.5s ease-out; }\n \t\t.faq-answer.open { max-height: 500px; padding-top: 1.5rem; }\n \t</style>\n</head>\n<body class=\"min-h-screen bg-gray-900 text-white overflow-x-hidden\">\n \t<header class=\"fixed top-0 w-full z-50 backdrop-blur-lg bg-gray-900/80 border-b border-blue-500/20\">\n \t\t<nav class=\"container mx-auto px-6 py-6\">\n \t\t\t<div class=\"flex items-center justify-between\">\n \t\t\t\t<div class=\"flex items-center space-x-3\">\n \t\t\t\t\t<div class=\"w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center\">\n \t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path d=\"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<span class=\"text-2xl font-bold\">CryptoVault</span>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"hidden md:flex items-center space-x-8\">\n \t\t\t\t\t<a href=\"#features\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">Features</a>\n \t\t\t\t\t<a href=\"#about\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">About</a>\n \t\t\t\t\t<a href=\"#faq\" class=\"text-gray-300 hover:text-blue-400 transition-colors\">FAQ</a>\n \t\t\t\t\t<button class=\"px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all\">\n \t\t\t\t\t\tLaunch App\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</nav>\n\t</header>\n \t<section class=\"relative pt-32 pb-24 px-6 overflow-hidden\">\n \t\t<div class=\"absolute inset-0 overflow-hidden\">\n \t\t\t<div class=\"absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse\"></div>\n \t\t\t<div class=\"absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse\"></div>\n \t\t</div>\n \t\t<div class=\"container mx-auto text-center relative z-10\">\n \t\t\t<div class=\"max-w-4xl mx-auto space-y-12\">\n \t\t\t\t<div class=\"inline-block px-6 py-2 bg-blue-500/10 border border-blue-400/30 rounded-full text-blue-400 text-sm mb-8\">\n \t\t\t\t\tThe Future of Digital Finance\n \t\t\t\t</div>\n \t\t\t\t<h1 class=\"text-6xl md:text-7xl lg:text-8xl font-bold leading-tight\">\n \t\t\t\t\t<span>Trade Crypto</span>\n \t\t\t\t\t<br/>\n \t\t\t\t\t<span class=\"bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent\">\n \t\t\t\t\t\tLike Never Before\n \t\t\t\t\t</span>\n \t\t\t\t</h1>\n \t\t\t\t<p class=\"text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed\">\n \t\t\t\t\tExperience the next generation of cryptocurrency trading with AI-powered insights, secure wallets, and seamless NFT integration\n \t\t\t\t</p>\n \t\t\t\t<div class=\"flex flex-col sm:flex-row items-center justify-center gap-6 pt-8\">\n \t\t\t\t\t<button class=\"px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105\">\n \t\t\t\t\t\tGet Started Free\n \t\t\t\t\t</button>\n \t\t\t\t\t<button class=\"px-10 py-4 border border-blue-400/30 rounded-lg text-lg font-semibold hover:bg-blue-500/10 transition-all\">\n \t\t\t\t\t\tView Demo\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"grid grid-cols-2 md:grid-cols-4 gap-8 pt-20\">\n \t\t\t\t\t<div class=\"space-y-2 animate-float\" style=\"animationDelay: 0s;\">\n \t\t\t\t\t\t<div class=\"text-4xl md:text-5xl font-bold\">$2.4B</div>\n \t\t\t\t\t\t<div class=\"text-gray-400\">Trading Volume</div>\n \t\t\t\t\t\t<div class=\"text-green-400 text-sm\">+24%</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.2s;\">\n \t\t\t\t\t\t<div class=\"text-4xl md:text-5xl font-bold\">850K+</div>\n \t\t\t\t\t\t<div class=\"text-gray-400\">Active Users</div>\n \t\t\t\t\t\t<div class=\"text-green-400 text-sm\">+12%</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.4s;\">\n \t\t\t\t\t\t<div class=\"text-4xl md:text-5xl font-bold\">150+</div>\n \t\t\t\t\t\t<div class=\"text-gray-400\">Cryptocurrencies</div>\n \t\t\t\t\t\t<div class=\"text-green-400 text-sm\">+8%</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"space-y-2 animate-float\" style=\"animationDelay: 0.6s;\">\n \t\t\t\t\t\t<div class=\"text-4xl md:text-5xl font-bold\">99.9%</div>\n \t\t\t\t\t\t<div class=\"text-gray-400\">Uptime</div>\n \t\t\t\t\t\t<div class=\"text-green-400 text-sm\">Stable</div>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"features\" class=\"py-32 px-6 relative\">\n \t\t<div class=\"container mx-auto\">\n \t\t\t<div class=\"text-center mb-20 space-y-6\">\n \t\t\t\t<h2 class=\"text-5xl md:text-6xl font-bold\">Powerful Features</h2>\n \t\t\t\t<p class=\"text-xl text-gray-400 max-w-2xl mx-auto\">\n \t\t\t\t\tEverything you need to manage, trade, and grow your crypto portfolio\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t\t<div class=\"grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto\">\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">Secure Wallet</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Military-grade encryption protects your digital assets 24/7</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 10V3L4 14h7v7l9-11h-7z\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">Instant Trading</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Execute trades in milliseconds with zero downtime</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">AI Analytics</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Smart insights powered by advanced machine learning</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">NFT Marketplace</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Discover, collect, and trade unique digital collectibles</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">Multi-Chain</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Support for Ethereum, Solana, Polygon, and more</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 group\">\n \t\t\t\t\t<div class=\"w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform\">\n \t\t\t\t\t\t<svg class=\"w-8 h-8\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</div>\n \t\t\t\t\t<h3 class=\"text-2xl font-bold mb-4 text-white\">DeFi Integration</h3>\n \t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Access lending, staking, and yield farming protocols</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"about\" class=\"py-32 px-6 relative\">\n \t\t<div class=\"container mx-auto max-w-6xl\">\n \t\t\t<div class=\"grid md:grid-cols-2 gap-16 items-center\">\n \t\t\t\t<div class=\"space-y-8\">\n \t\t\t\t\t<h2 class=\"text-5xl md:text-6xl font-bold leading-tight\">\n \t\t\t\t\t\tBuilt for the Future of Finance\n \t\t\t\t\t</h2>\n \t\t\t\t\t<p class=\"text-xl text-gray-400 leading-relaxed\">\n \t\t\t\t\t\tCryptoVault combines cutting-edge technology with user-friendly design to deliver the ultimate crypto trading experience. Our platform leverages AI and machine learning to provide real-time insights and automated trading strategies.\n \t\t\t\t\t</p>\n \t\t\t\t\t<div class=\"space-y-6\">\n \t\t\t\t\t\t<div class=\"flex items-start space-x-4\">\n \t\t\t\t\t\t\t<div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n \t\t\t\t\t\t\t\t<svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n \t\t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t\t<div>\n \t\t\t\t\t\t\t\t<h4 class=\"text-lg font-semibold mb-2\">Bank-Grade Security</h4>\n \t\t\t\t\t\t\t\t<p class=\"text-gray-400\">Multi-layer protection with cold storage and insurance coverage</p>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<div class=\"flex items-start space-x-4\">\n \t\t\t\t\t\t\t<div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n \t\t\t\t\t\t\t\t<svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n \t\t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t\t<div>\n \t\t\t\t\t\t\t\t<h4 class=\"text-lg font-semibold mb-2\">Lightning Fast</h4>\n \t\t\t\t\t\t\t\t<p class=\"text-gray-400\">Execute trades in milliseconds with our optimized infrastructure</p>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<div class=\"flex items-start space-x-4\">\n \t\t\t\t\t\t\t<div class=\"w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mt-1 flex-shrink-0\">\n \t\t\t\t\t\t\t\t<svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\" />\n \t\t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t\t<div>\n \t\t\t\t\t\t\t\t<h4 class=\"text-lg font-semibold mb-2\">24/7 Support</h4>\n \t\t\t\t\t\t\t\t<p class=\"text-gray-400\">Expert team available around the clock to assist you</p>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"relative\">\n \t\t\t\t\t<div class=\"absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl\"></div>\n \t\t\t\t\t<div class=\"relative p-8 bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-blue-500/30 space-y-6\">\n \t\t\t\t\t\t<div class=\"text-center space-y-4 pb-6 border-b border-blue-500/20\">\n \t\t\t\t\t\t\t<div class=\"text-5xl font-bold\">$156,843</div>\n \t\t\t\t\t\t\t<div class=\"text-gray-400\">Average Portfolio Value</div>\n \t\t\t\t\t\t\t<div class=\"text-green-400 text-lg\">+32.5% This Month</div>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<div class=\"space-y-4\">\n \t\t\t\t\t\t\t<div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n \t\t\t\t\t\t\t\t<span class=\"text-gray-400\">Bitcoin</span>\n \t\t\t\t\t\t\t\t<span class=\"font-semibold text-green-400\">+5.2%</span>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t\t<div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n \t\t\t\t\t\t\t\t<span class=\"text-gray-400\">Ethereum</span>\n \t\t\t\t\t\t\t\t<span class=\"font-semibold text-green-400\">+8.7%</span>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t\t<div class=\"flex items-center justify-between p-4 bg-gray-900/50 rounded-xl\">\n \t\t\t\t\t\t\t\t<span class=\"text-gray-400\">Solana</span>\n \t\t\t\t\t\t\t\t<span class=\"font-semibold text-green-400\">+12.3%</span>\n \t\t\t\t\t\t\t</div>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"faq\" class=\"py-32 px-6 relative\">\n \t\t<div class=\"container mx-auto max-w-4xl\">\n \t\t\t<div class=\"text-center mb-20 space-y-6\">\n \t\t\t\t<h2 class=\"text-5xl md:text-6xl font-bold\">Frequently Asked Questions</h2>\n \t\t\t\t<p class=\"text-xl text-gray-400\">\n \t\t\t\t\tEverything you need to know about our platform\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t\t<div class=\"space-y-6\">\n \t\t\t\t<div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n \t\t\t\t\t<div class=\"flex items-center justify-between faq-btn\">\n \t\t\t\t\t\t<h3 class=\"text-xl font-semibold text-white pr-4\">How secure is your platform?</h3>\n \t\t\t\t\t\t<div class=\"text-blue-400 transform transition-transform faq-icon\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"faq-answer\">\n \t\t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">We use bank-level encryption, multi-signature wallets, and cold storage for the majority of assets. Our platform undergoes regular security audits by third-party firms.</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n \t\t\t\t\t<div class=\"flex items-center justify-between faq-btn\">\n \t\t\t\t\t\t<h3 class=\"text-xl font-semibold text-white pr-4\">What cryptocurrencies can I trade?</h3>\n \t\t\t\t\t\t<div class=\"text-blue-400 transform transition-transform faq-icon\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"faq-answer\">\n \t\t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">We support over 150 cryptocurrencies including Bitcoin, Ethereum, Solana, Cardano, Polygon, and all major DeFi tokens.</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n \t\t\t\t\t<div class=\"flex items-center justify-between faq-btn\">\n \t\t\t\t\t\t<h3 class=\"text-xl font-semibold text-white pr-4\">How do I start trading NFTs?</h3>\n \t\t\t\t\t\t<div class=\"text-blue-400 transform transition-transform faq-icon\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"faq-answer\">\n \t\t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Simply connect your wallet, browse our marketplace, and make your first purchase. All NFTs are verified and stored securely on the blockchain.</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n \t\t\t\t\t<div class=\"flex items-center justify-between faq-btn\">\n \t\t\t\t\t\t<h3 class=\"text-xl font-semibold text-white pr-4\">Are there any trading fees?</h3>\n \t\t\t\t\t\t<div class=\"text-blue-400 transform transition-transform faq-icon\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"faq-answer\">\n \t\t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">We offer competitive fees starting at 0.1% for spot trading. Volume-based discounts are available for active traders.</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"faq-item p-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer\">\n \t\t\t\t\t<div class=\"flex items-center justify-between faq-btn\">\n \t\t\t\t\t\t<h3 class=\"text-xl font-semibold text-white pr-4\">Can I stake my crypto?</h3>\n \t\t\t\t\t\t<div class=\"text-blue-400 transform transition-transform faq-icon\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 4v16m8-8H4\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div class=\"faq-answer\">\n \t\t\t\t\t\t<p class=\"text-gray-400 leading-relaxed\">Yes! We offer staking for multiple cryptocurrencies with competitive APY rates. Earn passive income while holding your assets.</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section class=\"py-32 px-6 relative\">\n \t\t<div class=\"absolute inset-0 overflow-hidden\">\n \t\t\t<div class=\"absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl\"></div>\n \t\t</div>\n \t\t<div class=\"container mx-auto max-w-4xl text-center relative z-10\">\n \t\t\t<div class=\"p-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl border border-blue-500/30 space-y-8\">\n \t\t\t\t<h2 class=\"text-5xl md:text-6xl font-bold\">Start Trading Today</h2>\n \t\t\t\t<p class=\"text-xl text-gray-400 max-w-2xl mx-auto\">\n \t\t\t\t\tJoin over 850,000 users who trust CryptoVault with their digital assets\n \t\t\t\t</p>\n \t\t\t\t<div class=\"flex flex-col sm:flex-row items-center justify-center gap-6 pt-8\">\n \t\t\t\t\t<button class=\"px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105\">\n \t\t\t\t\t\tCreate Free Account\n \t\t\t\t\t</button>\n \t\t\t\t\t<button class=\"px-10 py-4 border border-blue-400/30 rounded-lg text-lg font-semibold hover:bg-blue-500/10 transition-all\">\n \t\t\t\t\t\tContact Sales\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<footer class=\"border-t border-blue-500/20 py-16 px-6\">\n \t\t<div class=\"container mx-auto\">\n \t\t\t<div class=\"grid md:grid-cols-4 gap-12 mb-12\">\n \t\t\t\t<div class=\"space-y-4\">\n \t\t\t\t\t<div class=\"flex items-center space-x-3\">\n \t\t\t\t\t\t<div class=\"w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n \t\t\t\t\t\t\t\t<path d=\"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\" />\n \t\t\t\t\t\t\t</svg>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<span class=\"text-xl font-bold\">CryptoVault</span>\n \t\t\t\t\t</div>\n \t\t\t\t\t<p class=\"text-gray-400\">\n \t\t\t\t\t\tThe future of digital finance, powered by blockchain technology.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-lg font-semibold mb-4\">Product</h4>\n \t\t\t\t\t<ul class=\"space-y-2 text-gray-400\">\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Features</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Pricing</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Security</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Roadmap</a></li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-lg font-semibold mb-4\">Company</h4>\n \t\t\t\t\t<ul class=\"space-y-2 text-gray-400\">\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">About</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Blog</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Careers</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Press</a></li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-lg font-semibold mb-4\">Support</h4>\n \t\t\t\t\t<ul class=\"space-y-2 text-gray-400\">\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Help Center</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Contact</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">API Docs</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Status</a></li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"pt-8 border-t border-blue-500/20 flex flex-col md:flex-row items-center justify-between text-gray-400\">\n \t\t\t\t<p>В© 2024 CryptoVault. All rights reserved.</p>\n \t\t\t\t<div class=\"flex items-center space-x-6 mt-4 md:mt-0\">\n \t\t\t\t\t<a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Privacy</a>\n \t\t\t\t\t<a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Terms</a>\n \t\t\t\t\t<a href=\"#\" class=\"hover:text-blue-400 transition-colors\">Cookies</a>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</footer>\n \t<script>\n \t\tdocument.addEventListener('DOMContentLoaded', () => {\n \t\t\tconst faqItems = document.querySelectorAll('.faq-item');\n \t\t\tlet activeIndex = null;\n \t\t\tfaqItems.forEach((item, index) => {\n \t\t\t\tconst button = item.querySelector('.faq-btn');\n \t\t\t\tconst answer = item.querySelector('.faq-answer');\n \t\t\t\tconst icon = item.querySelector('.faq-icon');\n \t\t\t\tbutton.addEventListener('click', () => {\n \t\t\t\t\tconst isCurrentlyOpen = answer.classList.contains('open');\n \t\t\t\t\tif (activeIndex !== null && activeIndex !== index) {\n \t\t\t\t\t\tconst prevItem = faqItems[activeIndex];\n \t\t\t\t\t\tconst prevAnswer = prevItem.querySelector('.faq-answer');\n \t\t\t\t\t\tconst prevIcon = prevItem.querySelector('.faq-icon');\n \t\t\t\t\t\tprevAnswer.classList.remove('open');\n \t\t\t\t\t\tprevIcon.classList.remove('rotate-45');\n \t\t\t\t\t}\n \t\t\t\t\tif (!isCurrentlyOpen) {\n \t\t\t\t\t\tanswer.classList.add('open');\n \t\t\t\t\t\ticon.classList.add('rotate-45');\n \t\t\t\t\t\tactiveIndex = index;\n \t\t\t\t\t} else {\n \t\t\t\t\t\tanswer.classList.remove('open');\n \t\t\t\t\t\ticon.classList.remove('rotate-45');\n \t\t\t\t\t\tactiveIndex = null;\n \t\t\t\t\t}\n \t\t\t\t});\n \t\t\t});\n \t\t});\n\t</script>\n</body>\n</html>"
  },
  "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s": {
    "id": "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
    "name": "IRONPULSE - Fitness Gym",
    "description": "Bold and aggressive fitness gym landing page with black and yellow design, perfect for gyms and fitness centers.",
    "thumbnail": "<section class=\"pt-32 pb-24 px-6\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid lg:grid-cols-2 gap-16 items-center\">\n      <div>\n        <div class=\"inline-block bg-yellow-400 text-black px-4 py-2 font-black text-sm mb-8\">\n          #1 FITNESS DESTINATION\n        </div>\n        <h1 class=\"text-7xl lg:text-8xl font-black leading-none mb-8\">\n          FORGE YOUR\n          <span class=\"block text-yellow-400\">ULTIMATE</span>\n          PHYSIQUE\n        </h1>\n        <p class=\"text-xl text-gray-400 mb-12 leading-relaxed\">\n          Transform your body and mind with expert coaching, cutting-edge equipment, and a community that pushes you to your limits.\n        </p>\n        <div class=\"flex flex-wrap gap-4\">\n          <button class=\"bg-yellow-400 text-black px-10 py-5 font-black text-lg hover:bg-yellow-300 transition-colors\">\n            START FREE TRIAL\n          </button>\n          <button class=\"border-4 border-yellow-400 text-yellow-400 px-10 py-5 font-black text-lg hover:bg-yellow-400 hover:text-black transition-colors\">\n            VIEW CLASSES\n          </button>\n        </div>\n      </div>\n      <div class=\"relative\">\n        <div class=\"aspect-square bg-gradient-to-br from-yellow-400 to-yellow-600 transform rotate-3\"></div>\n        <div class=\"absolute inset-0 border-4 border-yellow-400 transform -rotate-3\"></div>\n      </div>\n    </div>\n  </div>\n</section>",
    "category": "Fitness",
    "bodyClass": "class=\"min-h-screen bg-black text-white font-sans\"",
    "config": {
      "colors": {
        "primary": "#FACC15",
        "background": "#000000"
      }
    },
    "sections": {
      "header": "<header class=\"fixed top-0 left-0 right-0 z-50 bg-black border-b-4 border-yellow-400\">\n  <div class=\"max-w-7xl mx-auto px-6 py-6 flex items-center justify-between\">\n    <div class=\"flex items-center gap-3\">\n      <svg class=\"w-10 h-10\" viewBox=\"0 0 40 40\" fill=\"none\">\n        <rect x=\"4\" y=\"16\" width=\"8\" height=\"8\" fill=\"#FACC15\"/>\n        <rect x=\"28\" y=\"16\" width=\"8\" height=\"8\" fill=\"#FACC15\"/>\n        <rect x=\"12\" y=\"12\" width=\"16\" height=\"16\" fill=\"#FACC15\"/>\n      </svg>\n      <span class=\"text-2xl font-black tracking-tighter\">IRONPULSE</span>\n    </div>\n    <nav class=\"hidden md:flex items-center gap-8\">\n      <a href=\"#about\" class=\"font-bold hover:text-yellow-400 transition-colors\">ABOUT</a>\n      <a href=\"#trainers\" class=\"font-bold hover:text-yellow-400 transition-colors\">TRAINERS</a>\n      <a href=\"#pricing\" class=\"font-bold hover:text-yellow-400 transition-colors\">PRICING</a>\n      <a href=\"#faq\" class=\"font-bold hover:text-yellow-400 transition-colors\">FAQ</a>\n    </nav>\n    <button class=\"bg-yellow-400 text-black px-8 py-3 font-black hover:bg-yellow-300 transition-colors\">\n      JOIN NOW\n    </button>\n  </div>\n</header>",
      "hero": "<section class=\"pt-32 pb-24 px-6\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid lg:grid-cols-2 gap-16 items-center\">\n      <div>\n        <div class=\"inline-block bg-yellow-400 text-black px-4 py-2 font-black text-sm mb-8\">\n          #1 FITNESS DESTINATION\n        </div>\n        <h1 class=\"text-7xl lg:text-8xl font-black leading-none mb-8\">\n          FORGE YOUR\n          <span class=\"block text-yellow-400\">ULTIMATE</span>\n          PHYSIQUE\n        </h1>\n        <p class=\"text-xl text-gray-400 mb-12 leading-relaxed\">\n          Transform your body and mind with expert coaching, cutting-edge equipment, and a community that pushes you to your limits.\n        </p>\n        <div class=\"flex flex-wrap gap-4\">\n          <button class=\"bg-yellow-400 text-black px-10 py-5 font-black text-lg hover:bg-yellow-300 transition-colors\">\n            START FREE TRIAL\n          </button>\n          <button class=\"border-4 border-yellow-400 text-yellow-400 px-10 py-5 font-black text-lg hover:bg-yellow-400 hover:text-black transition-colors\">\n            VIEW CLASSES\n          </button>\n        </div>\n      </div>\n      <div class=\"relative\">\n        <img src=\"https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Fitness Training\" class=\"aspect-square object-cover transform rotate-3\" />\n        <div class=\"absolute inset-0 border-4 border-yellow-400 transform -rotate-3\"></div>\n      </div>\n    </div>\n  </div>\n</section>",
      "stats": "<section class=\"py-24 px-6 bg-yellow-400\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid grid-cols-2 lg:grid-cols-4 gap-8\">\n      <div class=\"text-center\">\n        <div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">5000+</div>\n        <div class=\"text-lg font-bold text-black/80\">Active Members</div>\n      </div>\n      <div class=\"text-center\">\n        <div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">50+</div>\n        <div class=\"text-lg font-bold text-black/80\">Expert Trainers</div>\n      </div>\n      <div class=\"text-center\">\n        <div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">100+</div>\n        <div class=\"text-lg font-bold text-black/80\">Classes Weekly</div>\n      </div>\n      <div class=\"text-center\">\n        <div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">24/7</div>\n        <div class=\"text-lg font-bold text-black/80\">Gym Access</div>\n      </div>\n    </div>\n  </div>\n</section>",
      "programs": "<section class=\"py-32 px-6\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid lg:grid-cols-2 gap-16\">\n      <div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n        <h3 class=\"text-3xl font-black mb-6\">STRENGTH TRAINING</h3>\n        <p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n          Build muscle and increase power with our state-of-the-art equipment and expert guidance.\n        </p>\n      </div>\n      <div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n        <h3 class=\"text-3xl font-black mb-6\">CARDIO PROGRAMS</h3>\n        <p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n          Maximize endurance and burn fat with high-intensity interval training and cardio zones.\n        </p>\n      </div>\n      <div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n        <h3 class=\"text-3xl font-black mb-6\">NUTRITION COACHING</h3>\n        <p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n          Get personalized meal plans designed to fuel your workouts and achieve your goals.\n        </p>\n      </div>\n      <div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n        <h3 class=\"text-3xl font-black mb-6\">GROUP CLASSES</h3>\n        <p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n          Join energizing group sessions from HIIT to yoga, led by certified instructors.\n        </p>\n      </div>\n    </div>\n  </div>\n</section>",
      "about": "<section id=\"about\" class=\"py-32 px-6 bg-gradient-to-b from-black to-gray-900\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <h2 class=\"text-6xl font-black mb-6\">WHO WE ARE</h2>\n      <div class=\"w-32 h-2 bg-yellow-400 mx-auto\"></div>\n    </div>\n    <div class=\"grid lg:grid-cols-2 gap-16 items-center\">\n      <div class=\"relative\">\n        <img src=\"https://images.pexels.com/photos/1552103/pexels-photo-1552103.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Fitness Gym\" class=\"aspect-[4/3] object-cover border-4 border-yellow-400\" />\n      </div>\n      <div>\n        <h3 class=\"text-4xl font-black mb-8 text-yellow-400\">\n          BUILT FOR CHAMPIONS\n        </h3>\n        <p class=\"text-xl text-gray-400 mb-8 leading-relaxed\">\n          IRONPULSE was founded with one mission: to create an environment where ordinary people achieve extraordinary results. We combine world-class facilities with expert coaching and a supportive community.\n        </p>\n        <p class=\"text-xl text-gray-400 mb-12 leading-relaxed\">\n          Whether you're a beginner taking your first steps or an athlete pushing for peak performance, we provide the tools, knowledge, and motivation to help you succeed.\n        </p>\n        <div class=\"flex flex-wrap gap-6\">\n          <div class=\"flex items-center gap-3\">\n            <svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-lg\">Certified Trainers</span>\n          </div>\n          <div class=\"flex items-center gap-3\">\n            <svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-lg\">Premium Equipment</span>\n          </div>\n          <div class=\"flex items-center gap-3\">\n            <svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-lg\">Results Guaranteed</span>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "trainers": "<section id=\"trainers\" class=\"py-32 px-6 bg-black\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <h2 class=\"text-6xl font-black mb-6\">ELITE TRAINERS</h2>\n      <div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n      <p class=\"text-xl text-gray-400 max-w-3xl mx-auto\">\n        Train with certified experts who have transformed thousands of lives\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-8\">\n      <div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n        <img src=\"https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 1\" class=\"aspect-[3/4] object-cover\" />\n        <div class=\"p-6 bg-yellow-400 text-black\">\n          <h3 class=\"text-2xl font-black mb-2\">MARCUS STEEL</h3>\n          <p class=\"font-bold mb-1\">Strength & Conditioning</p>\n          <p class=\"text-sm font-bold text-black/70\">12 Years Experience</p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n        <img src=\"https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 2\" class=\"aspect-[3/4] object-cover\" />\n        <div class=\"p-6 bg-yellow-400 text-black\">\n          <h3 class=\"text-2xl font-black mb-2\">SARAH THUNDER</h3>\n          <p class=\"font-bold mb-1\">HIIT & Cardio</p>\n          <p class=\"text-sm font-bold text-black/70\">8 Years Experience</p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n        <img src=\"https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 3\" class=\"aspect-[3/4] object-cover\" />\n        <div class=\"p-6 bg-yellow-400 text-black\">\n          <h3 class=\"text-2xl font-black mb-2\">JASON IRON</h3>\n          <p class=\"font-bold mb-1\">Bodybuilding</p>\n          <p class=\"text-sm font-bold text-black/70\">15 Years Experience</p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n        <img src=\"https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 4\" class=\"aspect-[3/4] object-cover\" />\n        <div class=\"p-6 bg-yellow-400 text-black\">\n          <h3 class=\"text-2xl font-black mb-2\">NINA POWER</h3>\n          <p class=\"font-bold mb-1\">Functional Training</p>\n          <p class=\"text-sm font-bold text-black/70\">10 Years Experience</p>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "pricing": "<section id=\"pricing\" class=\"py-32 px-6 bg-gradient-to-b from-gray-900 to-black\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <h2 class=\"text-6xl font-black mb-6\">MEMBERSHIP PLANS</h2>\n      <div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n      <p class=\"text-xl text-gray-400\">\n        Choose the plan that fits your fitness journey\n      </p>\n    </div>\n    <div class=\"grid md:grid-cols-3 gap-8\">\n      <div class=\"border-4 border-gray-700 bg-gray-900 p-10\">\n        <h3 class=\"text-3xl font-black mb-4 text-yellow-400\">STARTER</h3>\n        <div class=\"mb-8\">\n          <span class=\"text-6xl font-black\">$29</span>\n          <span class=\"text-xl font-bold text-gray-400\">/month</span>\n        </div>\n        <ul class=\"space-y-4 mb-10\">\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Access to gym floor</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Locker room access</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Basic equipment</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Mobile app access</span>\n          </li>\n        </ul>\n        <button class=\"w-full py-4 font-black text-lg transition-colors bg-yellow-400 text-black hover:bg-yellow-300\">\n          SELECT PLAN\n        </button>\n      </div>\n      <div class=\"border-4 border-yellow-400 bg-yellow-400 text-black transform scale-105 p-10\">\n        <h3 class=\"text-3xl font-black mb-4 text-black\">PRO</h3>\n        <div class=\"mb-8\">\n          <span class=\"text-6xl font-black\">$59</span>\n          <span class=\"text-xl font-bold text-black/70\">/month</span>\n        </div>\n        <ul class=\"space-y-4 mb-10\">\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-black\">Everything in Starter</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-black\">All group classes</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-black\">Personal trainer (2x/month)</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-black\">Nutrition consultation</span>\n          </li>\n        </ul>\n        <button class=\"w-full py-4 font-black text-lg transition-colors bg-black text-yellow-400 hover:bg-gray-900\">\n          SELECT PLAN\n        </button>\n      </div>\n      <div class=\"border-4 border-gray-700 bg-gray-900 p-10\">\n        <h3 class=\"text-3xl font-black mb-4 text-yellow-400\">ELITE</h3>\n        <div class=\"mb-8\">\n          <span class=\"text-6xl font-black\">$99</span>\n          <span class=\"text-xl font-bold text-gray-400\">/month</span>\n        </div>\n        <ul class=\"space-y-4 mb-10\">\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Everything in Pro</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Unlimited personal training</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Custom meal plans</span>\n          </li>\n          <li class=\"flex items-start gap-3\">\n            <svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n            <span class=\"font-bold text-gray-300\">Priority booking</span>\n          </li>\n        </ul>\n        <button class=\"w-full py-4 font-black text-lg transition-colors bg-yellow-400 text-black hover:bg-yellow-300\">\n          SELECT PLAN\n        </button>\n      </div>\n    </div>\n  </div>\n</section>",
      "faq": "<section id=\"faq\" class=\"py-32 px-6 bg-black\">\n  <div class=\"max-w-4xl mx-auto\">\n    <div class=\"text-center mb-20\">\n      <h2 class=\"text-6xl font-black mb-6\">FAQ</h2>\n      <div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n      <p class=\"text-xl text-gray-400\">\n        Everything you need to know\n      </p>\n    </div>\n    <div class=\"space-y-6\" id=\"faq-container\">\n      <div class=\"border-4 border-yellow-400\">\n        <button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n          <span class=\"text-2xl font-black pr-4\">What are your gym hours?</span>\n          <svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n            <path d=\"M19 9l-7 7-7-7\"/>\n          </svg>\n        </button>\n        <div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n          <p class=\"text-lg text-gray-400 leading-relaxed\">\n            We are open 24/7, 365 days a year. Access your workouts anytime that fits your schedule.\n          </p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400\">\n        <button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n          <span class=\"text-2xl font-black pr-4\">Do you offer trial memberships?</span>\n          <svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n            <path d=\"M19 9l-7 7-7-7\"/>\n          </svg>\n        </button>\n        <div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n          <p class=\"text-lg text-gray-400 leading-relaxed\">\n            Yes! We offer a 7-day free trial so you can experience our facilities and classes before committing.\n          </p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400\">\n        <button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n          <span class=\"text-2xl font-black pr-4\">Can I freeze my membership?</span>\n          <svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n            <path d=\"M19 9l-7 7-7-7\"/>\n          </svg>\n        </button>\n        <div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n          <p class=\"text-lg text-gray-400 leading-relaxed\">\n            Absolutely. You can freeze your membership for up to 3 months per year with 48 hours notice.\n          </p>\n        </div>\n      </div>\n      <div class=\"border-4 border-yellow-400\">\n        <button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n          <span class=\"text-2xl font-black pr-4\">What equipment do you have?</span>\n          <svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n            <path d=\"M19 9l-7 7-7-7\"/>\n          </svg>\n        </button>\n        <div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n          <p class=\"text-lg text-gray-400 leading-relaxed\">\n            We feature premium equipment including free weights, machines, cardio equipment, functional training zones, and specialized areas for CrossFit and powerlifting.\n          </p>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>",
      "footer": "<footer class=\"py-20 px-6 bg-yellow-400 text-black\">\n  <div class=\"max-w-7xl mx-auto\">\n    <div class=\"grid md:grid-cols-4 gap-12 mb-12\">\n      <div>\n        <div class=\"flex items-center gap-3 mb-6\">\n          <svg class=\"w-10 h-10\" viewBox=\"0 0 40 40\" fill=\"none\">\n            <rect x=\"4\" y=\"16\" width=\"8\" height=\"8\" fill=\"black\"/>\n            <rect x=\"28\" y=\"16\" width=\"8\" height=\"8\" fill=\"black\"/>\n            <rect x=\"12\" y=\"12\" width=\"16\" height=\"16\" fill=\"black\"/>\n          </svg>\n          <span class=\"text-2xl font-black tracking-tighter\">IRONPULSE</span>\n        </div>\n        <p class=\"font-bold text-black/80\">\n          Transform your life through fitness\n        </p>\n      </div>\n      <div>\n        <h4 class=\"text-xl font-black mb-4\">QUICK LINKS</h4>\n        <ul class=\"space-y-2 font-bold\">\n          <li><a href=\"#about\" class=\"hover:text-black/70\">About Us</a></li>\n          <li><a href=\"#trainers\" class=\"hover:text-black/70\">Trainers</a></li>\n          <li><a href=\"#pricing\" class=\"hover:text-black/70\">Pricing</a></li>\n          <li><a href=\"#faq\" class=\"hover:text-black/70\">FAQ</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4 class=\"text-xl font-black mb-4\">PROGRAMS</h4>\n        <ul class=\"space-y-2 font-bold\">\n          <li><a href=\"#\" class=\"hover:text-black/70\">Strength Training</a></li>\n          <li><a href=\"#\" class=\"hover:text-black/70\">Cardio Programs</a></li>\n          <li><a href=\"#\" class=\"hover:text-black/70\">Nutrition Coaching</a></li>\n          <li><a href=\"#\" class=\"hover:text-black/70\">Group Classes</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4 class=\"text-xl font-black mb-4\">CONTACT</h4>\n        <ul class=\"space-y-2 font-bold\">\n          <li>123 Fitness Street</li>\n          <li>New York, NY 10001</li>\n          <li>+1 (555) 123-4567</li>\n          <li>info@ironpulse.com</li>\n        </ul>\n      </div>\n    </div>\n    <div class=\"pt-8 border-t-4 border-black text-center\">\n      <p class=\"font-black\">\n        В© 2025 IRONPULSE. ALL RIGHTS RESERVED.\n      </p>\n    </div>\n  </div>\n</footer>",
      "javascript": "<script>\n  document.addEventListener('DOMContentLoaded', () => {\n    const buttons = document.querySelectorAll('.faq-btn');\n    const answers = document.querySelectorAll('.faq-answer');\n    const icons = document.querySelectorAll('.faq-icon');\n    buttons.forEach((button, index) => {\n      button.addEventListener('click', () => {\n        const answer = answers[index];\n        const icon = icons[index];\n        const isCurrentlyOpen = !answer.classList.contains('hidden');\n        answers.forEach(a => a.classList.add('hidden'));\n        icons.forEach(i => i.classList.remove('rotate-180'));\n        if (!isCurrentlyOpen) {\n          answer.classList.remove('hidden');\n          icon.classList.add('rotate-180');\n        }\n      });\n    });\n  });\n</script>"
    },
    "full_html_template": "<!DOCTYPE html>\n<html lang=\"en\" class=\"scroll-smooth\">\n<head>\n \t<meta charset=\"UTF-8\">\n \t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n \t<title>IRONPULSE Fitness</title>\n \t<script src=\"https://cdn.tailwindcss.com\"></script>\n</head>\n<body class=\"min-h-screen bg-black text-white font-sans\">\n \t<header class=\"fixed top-0 left-0 right-0 z-50 bg-black border-b-4 border-yellow-400\">\n \t\t<div class=\"max-w-7xl mx-auto px-6 py-6 flex items-center justify-between\">\n \t\t\t<div class=\"flex items-center gap-3\">\n \t\t\t\t<svg class=\"w-10 h-10\" viewBox=\"0 0 40 40\" fill=\"none\">\n \t\t\t\t\t<rect x=\"4\" y=\"16\" width=\"8\" height=\"8\" fill=\"#FACC15\"/>\n \t\t\t\t\t<rect x=\"28\" y=\"16\" width=\"8\" height=\"8\" fill=\"#FACC15\"/>\n \t\t\t\t\t<rect x=\"12\" y=\"12\" width=\"16\" height=\"16\" fill=\"#FACC15\"/>\n \t\t\t\t</svg>\n \t\t\t\t<span class=\"text-2xl font-black tracking-tighter\">IRONPULSE</span>\n \t\t\t</div>\n \t\t\t<nav class=\"hidden md:flex items-center gap-8\">\n \t\t\t\t<a href=\"#about\" class=\"font-bold hover:text-yellow-400 transition-colors\">ABOUT</a>\n \t\t\t\t<a href=\"#trainers\" class=\"font-bold hover:text-yellow-400 transition-colors\">TRAINERS</a>\n \t\t\t\t<a href=\"#pricing\" class=\"font-bold hover:text-yellow-400 transition-colors\">PRICING</a>\n \t\t\t\t<a href=\"#faq\" class=\"font-bold hover:text-yellow-400 transition-colors\">FAQ</a>\n \t\t\t</nav>\n \t\t\t<button class=\"bg-yellow-400 text-black px-8 py-3 font-black hover:bg-yellow-300 transition-colors\">\n \t\t\t\tJOIN NOW\n \t\t\t</button>\n \t\t</div>\n\t</header>\n \t<section class=\"pt-32 pb-24 px-6\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"grid lg:grid-cols-2 gap-16 items-center\">\n \t\t\t\t<div>\n \t\t\t\t\t<div class=\"inline-block bg-yellow-400 text-black px-4 py-2 font-black text-sm mb-8\">\n \t\t\t\t\t\t#1 FITNESS DESTINATION\n \t\t\t\t\t</div>\n \t\t\t\t\t<h1 class=\"text-7xl lg:text-8xl font-black leading-none mb-8\">\n \t\t\t\t\t\tFORGE YOUR\n \t\t\t\t\t\t<span class=\"block text-yellow-400\">ULTIMATE</span>\n \t\t\t\t\t\tPHYSIQUE\n \t\t\t\t\t</h1>\n \t\t\t\t\t<p class=\"text-xl text-gray-400 mb-12 leading-relaxed\">\n \t\t\t\t\t\tTransform your body and mind with expert coaching, cutting-edge equipment, and a community that pushes you to your limits.\n \t\t\t\t\t</p>\n \t\t\t\t\t<div class=\"flex flex-wrap gap-4\">\n \t\t\t\t\t\t<button class=\"bg-yellow-400 text-black px-10 py-5 font-black text-lg hover:bg-yellow-300 transition-colors\">\n \t\t\t\t\t\t\tSTART FREE TRIAL\n \t\t\t\t\t\t</button>\n \t\t\t\t\t\t<button class=\"border-4 border-yellow-400 text-yellow-400 px-10 py-5 font-black text-lg hover:bg-yellow-400 hover:text-black transition-colors\">\n \t\t\t\t\t\t\tVIEW CLASSES\n \t\t\t\t\t\t</button>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"relative\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Fitness Training\" class=\"aspect-square object-cover transform rotate-3\" />\n \t\t\t\t\t<div class=\"absolute inset-0 border-4 border-yellow-400 transform -rotate-3\"></div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section class=\"py-24 px-6 bg-yellow-400\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"grid grid-cols-2 lg:grid-cols-4 gap-8\">\n \t\t\t\t<div class=\"text-center\">\n \t\t\t\t\t<div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">5000+</div>\n \t\t\t\t\t<div class=\"text-lg font-bold text-black/80\">Active Members</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"text-center\">\n \t\t\t\t\t<div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">50+</div>\n \t\t\t\t\t<div class=\"text-lg font-bold text-black/80\">Expert Trainers</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"text-center\">\n \t\t\t\t\t<div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">100+</div>\n \t\t\t\t\t<div class=\"text-lg font-bold text-black/80\">Classes Weekly</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"text-center\">\n \t\t\t\t\t<div class=\"text-5xl lg:text-6xl font-black text-black mb-2\">24/7</div>\n \t\t\t\t\t<div class=\"text-lg font-bold text-black/80\">Gym Access</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section class=\"py-32 px-6\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"grid lg:grid-cols-2 gap-16\">\n \t\t\t\t<div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-6\">STRENGTH TRAINING</h3>\n \t\t\t\t\t<p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n \t\t\t\t\t\tBuild muscle and increase power with our state-of-the-art equipment and expert guidance.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-6\">CARDIO PROGRAMS</h3>\n \t\t\t\t\t<p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n \t\t\t\t\t\tMaximize endurance and burn fat with high-intensity interval training and cardio zones.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-6\">NUTRITION COACHING</h3>\n \t\t\t\t\t<p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n \t\t\t\t\t\tGet personalized meal plans designed to fuel your workouts and achieve your goals.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 p-12 hover:bg-yellow-400 hover:text-black transition-all duration-300 group\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-6\">GROUP CLASSES</h3>\n \t\t\t\t\t<p class=\"text-lg text-gray-400 group-hover:text-black/80 leading-relaxed\">\n \t\t\t\t\t\tJoin energizing group sessions from HIIT to yoga, led by certified instructors.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"about\" class=\"py-32 px-6 bg-gradient-to-b from-black to-gray-900\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"text-center mb-20\">\n \t\t\t\t<h2 class=\"text-6xl font-black mb-6\">WHO WE ARE</h2>\n \t\t\t\t<div class=\"w-32 h-2 bg-yellow-400 mx-auto\"></div>\n \t\t\t</div>\n \t\t\t<div class=\"grid lg:grid-cols-2 gap-16 items-center\">\n \t\t\t\t<div class=\"relative\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552103/pexels-photo-1552103.jpeg?auto=compress&cs=tinysrgb&w=1260\" alt=\"Fitness Gym\" class=\"aspect-[4/3] object-cover border-4 border-yellow-400\" />\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h3 class=\"text-4xl font-black mb-8 text-yellow-400\">\n \t\t\t\t\t\tBUILT FOR CHAMPIONS\n \t\t\t\t\t</h3>\n \t\t\t\t\t<p class=\"text-xl text-gray-400 mb-8 leading-relaxed\">\n \t\t\t\t\t\tIRONPULSE was founded with one mission: to create an environment where ordinary people achieve extraordinary results. We combine world-class facilities with expert coaching and a supportive community.\n \t\t\t\t\t</p>\n \t\t\t\t\t<p class=\"text-xl text-gray-400 mb-12 leading-relaxed\">\n \t\t\t\t\t\tWhether you're a beginner taking your first steps or an athlete pushing for peak performance, we provide the tools, knowledge, and motivation to help you succeed.\n \t\t\t\t\t</p>\n \t\t\t\t\t<div class=\"flex flex-wrap gap-6\">\n \t\t\t\t\t\t<div class=\"flex items-center gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-lg\">Certified Trainers</span>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<div class=\"flex items-center gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-lg\">Premium Equipment</span>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t\t<div class=\"flex items-center gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-8 h-8 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-lg\">Results Guaranteed</span>\n \t\t\t\t\t\t</div>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"trainers\" class=\"py-32 px-6 bg-black\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"text-center mb-20\">\n \t\t\t\t<h2 class=\"text-6xl font-black mb-6\">ELITE TRAINERS</h2>\n \t\t\t\t<div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n \t\t\t\t<p class=\"text-xl text-gray-400 max-w-3xl mx-auto\">\n \t\t\t\t\tTrain with certified experts who have transformed thousands of lives\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t\t<div class=\"grid md:grid-cols-2 lg:grid-cols-4 gap-8\">\n \t\t\t\t<div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 1\" class=\"aspect-[3/4] object-cover\" />\n \t\t\t\t\t<div class=\"p-6 bg-yellow-400 text-black\">\n \t\t\t\t\t\t<h3 class=\"text-2xl font-black mb-2\">MARCUS STEEL</h3>\n \t\t\t\t\t\t<p class=\"font-bold mb-1\">Strength & Conditioning</p>\n \t\t\t\t\t\t<p class=\"text-sm font-bold text-black/70\">12 Years Experience</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 2\" class=\"aspect-[3/4] object-cover\" />\n \t\t\t\t\t<div class=\"p-6 bg-yellow-400 text-black\">\n \t\t\t\t\t\t<h3 class=\"text-2xl font-black mb-2\">SARAH THUNDER</h3>\n \t\t\t\t\t\t<p class=\"font-bold mb-1\">HIIT & Cardio</p>\n \t\t\t\t\t\t<p class=\"text-sm font-bold text-black/70\">8 Years Experience</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 3\" class=\"aspect-[3/4] object-cover\" />\n \t\t\t\t\t<div class=\"p-6 bg-yellow-400 text-black\">\n \t\t\t\t\t\t<h3 class=\"text-2xl font-black mb-2\">JASON IRON</h3>\n \t\t\t\t\t\t<p class=\"font-bold mb-1\">Bodybuilding</p>\n \t\t\t\t\t\t<p class=\"text-sm font-bold text-black/70\">15 Years Experience</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 overflow-hidden hover:transform hover:-translate-y-2 transition-transform duration-300\">\n \t\t\t\t\t<img src=\"https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800\" alt=\"Fitness Trainer 4\" class=\"aspect-[3/4] object-cover\" />\n \t\t\t\t\t<div class=\"p-6 bg-yellow-400 text-black\">\n \t\t\t\t\t\t<h3 class=\"text-2xl font-black mb-2\">NINA POWER</h3>\n \t\t\t\t\t\t<p class=\"font-bold mb-1\">Functional Training</p>\n \t\t\t\t\t\t<p class=\"text-sm font-bold text-black/70\">10 Years Experience</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"pricing\" class=\"py-32 px-6 bg-gradient-to-b from-gray-900 to-black\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"text-center mb-20\">\n \t\t\t\t<h2 class=\"text-6xl font-black mb-6\">MEMBERSHIP PLANS</h2>\n \t\t\t\t<div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n \t\t\t\t<p class=\"text-xl text-gray-400\">\n \t\t\t\t\tChoose the plan that fits your fitness journey\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t\t<div class=\"grid md:grid-cols-3 gap-8\">\n \t\t\t\t<div class=\"border-4 border-gray-700 bg-gray-900 p-10\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-4 text-yellow-400\">STARTER</h3>\n \t\t\t\t\t<div class=\"mb-8\">\n \t\t\t\t\t\t<span class=\"text-6xl font-black\">$29</span>\n \t\t\t\t\t\t<span class=\"text-xl font-bold text-gray-400\">/month</span>\n \t\t\t\t\t</div>\n \t\t\t\t\t<ul class=\"space-y-4 mb-10\">\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Access to gym floor</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Locker room access</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Basic equipment</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Mobile app access</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t</ul>\n \t\t\t\t\t<button class=\"w-full py-4 font-black text-lg transition-colors bg-yellow-400 text-black hover:bg-yellow-300\">\n \t\t\t\t\t\tSELECT PLAN\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400 bg-yellow-400 text-black transform scale-105 p-10\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-4 text-black\">PRO</h3>\n \t\t\t\t\t<div class=\"mb-8\">\n \t\t\t\t\t\t<span class=\"text-6xl font-black\">$59</span>\n \t\t\t\t\t\t<span class=\"text-xl font-bold text-black/70\">/month</span>\n \t\t\t\t\t</div>\n \t\t\t\t\t<ul class=\"space-y-4 mb-10\">\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-black\">Everything in Starter</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-black\">All group classes</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-black\">Personal trainer (2x/month)</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-black\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-black\">Nutrition consultation</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t</ul>\n \t\t\t\t\t<button class=\"w-full py-4 font-black text-lg transition-colors bg-black text-yellow-400 hover:bg-gray-900\">\n \t\t\t\t\t\tSELECT PLAN\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-gray-700 bg-gray-900 p-10\">\n \t\t\t\t\t<h3 class=\"text-3xl font-black mb-4 text-yellow-400\">ELITE</h3>\n \t\t\t\t\t<div class=\"mb-8\">\n \t\t\t\t\t\t<span class=\"text-6xl font-black\">$99</span>\n \t\t\t\t\t\t<span class=\"text-xl font-bold text-gray-400\">/month</span>\n \t\t\t\t\t</div>\n \t\t\t\t\t<ul class=\"space-y-4 mb-10\">\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Everything in Pro</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Unlimited personal training</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Custom meal plans</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t\t<li class=\"flex items-start gap-3\">\n \t\t\t\t\t\t\t<svg class=\"w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z\"/></svg>\n \t\t\t\t\t\t\t<span class=\"font-bold text-gray-300\">Priority booking</span>\n \t\t\t\t\t\t</li>\n \t\t\t\t\t</ul>\n \t\t\t\t\t<button class=\"w-full py-4 font-black text-lg transition-colors bg-yellow-400 text-black hover:bg-yellow-300\">\n \t\t\t\t\t\tSELECT PLAN\n \t\t\t\t\t</button>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"faq\" class=\"py-32 px-6 bg-black\">\n \t\t<div class=\"max-w-4xl mx-auto\">\n \t\t\t<div class=\"text-center mb-20\">\n \t\t\t\t<h2 class=\"text-6xl font-black mb-6\">FAQ</h2>\n \t\t\t\t<div class=\"w-32 h-2 bg-yellow-400 mx-auto mb-6\"></div>\n \t\t\t\t<p class=\"text-xl text-gray-400\">\n \t\t\t\t\tEverything you need to know\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t\t<div class=\"space-y-6\" id=\"faq-container\">\n \t\t\t\t<div class=\"border-4 border-yellow-400\">\n \t\t\t\t\t<button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n \t\t\t\t\t\t<span class=\"text-2xl font-black pr-4\">What are your gym hours?</span>\n \t\t\t\t\t\t<svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n \t\t\t\t\t\t\t<path d=\"M19 9l-7 7-7-7\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</button>\n \t\t\t\t\t<div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n \t\t\t\t\t\t<p class=\"text-lg text-gray-400 leading-relaxed\">\n \t\t\t\t\t\t\tWe are open 24/7, 365 days a year. Access your workouts anytime that fits your schedule.\n \t\t\t\t\t\t</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400\">\n \t\t\t\t\t<button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n \t\t\t\t\t\t<span class=\"text-2xl font-black pr-4\">Do you offer trial memberships?</span>\n \t\t\t\t\t\t<svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n \t\t\t\t\t\t\t<path d=\"M19 9l-7 7-7-7\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</button>\n \t\t\t\t\t<div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n \t\t\t\t\t\t<p class=\"text-lg text-gray-400 leading-relaxed\">\n \t\t\t\t\t\t\tYes! We offer a 7-day free trial so you can experience our facilities and classes before committing.\n \t\t\t\t\t\t</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400\">\n \t\t\t\t\t<button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n \t\t\t\t\t\t<span class=\"text-2xl font-black pr-4\">Can I freeze my membership?</span>\n \t\t\t\t\t\t<svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n \t\t\t\t\t\t\t<path d=\"M19 9l-7 7-7-7\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</button>\n \t\t\t\t\t<div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n \t\t\t\t\t\t<p class=\"text-lg text-gray-400 leading-relaxed\">\n \t\t\t\t\t\t\tAbsolutely. You can freeze your membership for up to 3 months per year with 48 hours notice.\n \t\t\t\t\t\t</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"border-4 border-yellow-400\">\n \t\t\t\t\t<button class=\"w-full p-8 flex items-center justify-between text-left hover:bg-yellow-400 hover:text-black transition-colors group faq-btn\">\n \t\t\t\t\t\t<span class=\"text-2xl font-black pr-4\">What equipment do you have?</span>\n \t\t\t\t\t\t<svg class=\"w-8 h-8 flex-shrink-0 transition-transform faq-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\">\n \t\t\t\t\t\t\t<path d=\"M19 9l-7 7-7-7\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t</button>\n \t\t\t\t\t<div class=\"hidden px-8 pb-8 pt-0 faq-answer\">\n \t\t\t\t\t\t<p class=\"text-lg text-gray-400 leading-relaxed\">\n \t\t\t\t\t\t\tWe feature premium equipment including free weights, machines, cardio equipment, functional training zones, and specialized areas for CrossFit and powerlifting.\n \t\t\t\t\t\t</p>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<footer class=\"py-20 px-6 bg-yellow-400 text-black\">\n \t\t<div class=\"max-w-7xl mx-auto\">\n \t\t\t<div class=\"grid md:grid-cols-4 gap-12 mb-12\">\n \t\t\t\t<div>\n \t\t\t\t\t<div class=\"flex items-center gap-3 mb-6\">\n \t\t\t\t\t\t<svg class=\"w-10 h-10\" viewBox=\"0 0 40 40\" fill=\"none\">\n \t\t\t\t\t\t\t<rect x=\"4\" y=\"16\" width=\"8\" height=\"8\" fill=\"black\"/>\n \t\t\t\t\t\t\t<rect x=\"28\" y=\"16\" width=\"8\" height=\"8\" fill=\"black\"/>\n \t\t\t\t\t\t\t<rect x=\"12\" y=\"12\" width=\"16\" height=\"16\" fill=\"black\"/>\n \t\t\t\t\t\t</svg>\n \t\t\t\t\t\t<span class=\"text-2xl font-black tracking-tighter\">IRONPULSE</span>\n \t\t\t\t\t</div>\n \t\t\t\t\t<p class=\"font-bold text-black/80\">\n \t\t\t\t\t\tTransform your life through fitness\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-xl font-black mb-4\">QUICK LINKS</h4>\n \t\t\t\t\t<ul class=\"space-y-2 font-bold\">\n \t\t\t\t\t\t<li><a href=\"#about\" class=\"hover:text-black/70\">About Us</a></li>\n \t\t\t\t\t\t<li><a href=\"#trainers\" class=\"hover:text-black/70\">Trainers</a></li>\n \t\t\t\t\t\t<li><a href=\"#pricing\" class=\"hover:text-black/70\">Pricing</a></li>\n \t\t\t\t\t\t<li><a href=\"#faq\" class=\"hover:text-black/70\">FAQ</a></li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-xl font-black mb-4\">PROGRAMS</h4>\n \t\t\t\t\t<ul class=\"space-y-2 font-bold\">\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-black/70\">Strength Training</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-black/70\">Cardio Programs</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-black/70\">Nutrition Coaching</a></li>\n \t\t\t\t\t\t<li><a href=\"#\" class=\"hover:text-black/70\">Group Classes</a></li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t\t<div>\n \t\t\t\t\t<h4 class=\"text-xl font-black mb-4\">CONTACT</h4>\n \t\t\t\t\t<ul class=\"space-y-2 font-bold\">\n \t\t\t\t\t\t<li>123 Fitness Street</li>\n \t\t\t\t\t\t<li>New York, NY 10001</li>\n \t\t\t\t\t\t<li>+1 (555) 123-4567</li>\n \t\t\t\t\t\t<li>info@ironpulse.com</li>\n \t\t\t\t\t</ul>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"pt-8 border-t-4 border-black text-center\">\n \t\t\t\t<p class=\"font-black\">\n \t\t\t\t\tВ© 2025 IRONPULSE. ALL RIGHTS RESERVED.\n \t\t\t\t</p>\n \t\t\t</div>\n \t\t</div>\n\t</footer>\n \t<script>\n \t\tdocument.addEventListener('DOMContentLoaded', () => {\n \t\t\tconst buttons = document.querySelectorAll('.faq-btn');\n \t\t\tconst answers = document.querySelectorAll('.faq-answer');\n \t\t\tconst icons = document.querySelectorAll('.faq-icon');\n \t\t\tbuttons.forEach((button, index) => {\n \t\t\t\tbutton.addEventListener('click', () => {\n \t\t\t\t\tconst answer = answers[index];\n \t\t\t\t\tconst icon = icons[index];\n \t\t\t\t\tconst isCurrentlyOpen = !answer.classList.contains('hidden');\n \t\t\t\t\tanswers.forEach(a => a.classList.add('hidden'));\n \t\t\t\t\ticons.forEach(i => i.classList.remove('rotate-180'));\n \t\t\t\t\tif (!isCurrentlyOpen) {\n \t\t\t\t\t\tanswer.classList.remove('hidden');\n \t\t\t\t\t\ticon.classList.add('rotate-180');\n \t\t\t\t\t}\n \t\t\t\t});\n \t\t\t});\n \t\t});\n\t</script>\n</body>\n</html>"
  },
  "9f8e7d6c-5b4a-3c2d-1e0f-9g8h7i6j5k4l": {
    "id": "9f8e7d6c-5b4a-3c2d-1e0f-9g8h7i6j5k4l",
    "name": "STUDIO - Creative Portfolio",
    "description": "Minimalist black and white portfolio for creative directors, photographers, and visual artists.",
    "thumbnail": "<section class=\"pt-48 pb-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t<div class=\"space-y-8\">\n \t \t<h1 class=\"text-[12vw] md:text-[10vw] lg:text-[8vw] font-bold leading-[0.9] tracking-tighter\">\n \t \t \tCREATIVE<br/>\n \t \t \tDIRECTOR &<br/>\n \t \t \tVISUAL<br/>\n \t \t \tARTIST\n \t \t</h1>\n \t \t<p class=\"text-xl md:text-2xl max-w-2xl ml-auto text-right tracking-wide\">\n \t \t \tCrafting bold visual narratives through photography, design, and motion\n \t \t</p>\n \t</div>\n</section>",
    "category": "Portfolio",
    "bodyClass": "class=\"bg-white text-black font-sans\"",
    "config": {
      "colors": {
        "primary": "#000000",
        "background": "#FFFFFF"
      }
    },
    "sections": {
      "header": "<header class=\"fixed top-0 left-0 right-0 z-50 bg-white border-b border-black\">\n \t<nav class=\"max-w-[1800px] mx-auto px-8 md:px-16 py-8 flex justify-between items-center\">\n \t \t<div class=\"text-2xl font-bold tracking-tighter\">STUDIO</div>\n \t \t<div class=\"flex gap-12 text-sm tracking-wider\">\n \t \t \t<a href=\"#work\" class=\"hover:opacity-50 transition-opacity\">WORK</a>\n \t \t \t<a href=\"#about\" class=\"hover:opacity-50 transition-opacity\">ABOUT</a>\n \t \t \t<a href=\"#contact\" class=\"hover:opacity-50 transition-opacity\">CONTACT</a>\n \t \t</div>\n \t</nav>\n</header>",
      "hero": "<section class=\"pt-48 pb-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t<div class=\"space-y-8\">\n \t \t<h1 class=\"text-[12vw] md:text-[10vw] lg:text-[8vw] font-bold leading-[0.9] tracking-tighter\">\n \t \t \tCREATIVE<br/>\n \t \t \tDIRECTOR &<br/>\n \t \t \tVISUAL<br/>\n \t \t \tARTIST\n \t \t</h1>\n \t \t<p class=\"text-xl md:text-2xl max-w-2xl ml-auto text-right tracking-wide\">\n \t \t \tCrafting bold visual narratives through photography, design, and motion\n \t \t</p>\n \t</div>\n</section>",
      "work": "<section id=\"work\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-24 tracking-tighter\">\n \t \tSELECTED<br/>WORKS\n \t</h2>\n \t<div class=\"space-y-32\">\n \t \t<div class=\"group cursor-pointer\">\n \t \t \t<div class=\"relative overflow-hidden\">\n \t \t \t \t<img\n \t \t \t \t \tsrc=\"https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t \t \t \t \talt=\"URBAN LANDSCAPES\"\n \t \t \t \t \tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t \t \t \t/>\n \t \t \t \t<div class=\"absolute top-8 left-8 text-white\">\n \t \t \t \t \t<span class=\"text-sm tracking-widest\">01</span>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t \t<div class=\"mt-8 flex justify-between items-end\">\n \t \t \t \t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">URBAN LANDSCAPES</h3>\n \t \t \t \t<span class=\"text-lg tracking-widest\">Photography</span>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"group cursor-pointer\">\n \t \t \t<div class=\"relative overflow-hidden\">\n \t \t \t \t<img\n \t \t \t \t \tsrc=\"https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t \t \t \t \talt=\"EDITORIAL DESIGN\"\n \t \t \t \t \tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t \t \t \t/>\n \t \t \t \t<div class=\"absolute top-8 left-8 text-white\">\n \t \t \t \t \t<span class=\"text-sm tracking-widest\">02</span>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t \t<div class=\"mt-8 flex justify-between items-end\">\n \t \t \t \t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">EDITORIAL DESIGN</h3>\n \t \t \t \t<span class=\"text-lg tracking-widest\">Design</span>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"group cursor-pointer\">\n \t \t \t<div class=\"relative overflow-hidden\">\n \t \t \t \t<img\n \t \t \t \t \tsrc=\"https://images.pexels.com/photos/1294875/pexels-photo-1294875.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t \t \t \t \talt=\"MOTION STUDY\"\n \t \t \t \t \tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t \t \t \t/>\n \t \t \t \t<div class=\"absolute top-8 left-8 text-white\">\n \t \t \t \t \t<span class=\"text-sm tracking-widest\">03</span>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t \t<div class=\"mt-8 flex justify-between items-end\">\n \t \t \t \t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">MOTION STUDY</h3>\n \t \t \t \t<span class=\"text-lg tracking-widest\">Video</span>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"group cursor-pointer\">\n \t \t \t<div class=\"relative overflow-hidden\">\n \t \t \t \t<img\n \t \t \t \t \tsrc=\"https://images.pexels.com/photos/1707215/pexels-photo-1707215.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t \t \t \t \talt=\"BRAND IDENTITY\"\n \t \t \t \t \tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t \t \t \t/>\n \t \t \t \t<div class=\"absolute top-8 left-8 text-white\">\n \t \t \t \t \t<span class=\"text-sm tracking-widest\">04</span>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t \t<div class=\"mt-8 flex justify-between items-end\">\n \t \t \t \t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">BRAND IDENTITY</h3>\n \t \t \t \t<span class=\"text-lg tracking-widest\">Design</span>\n \t \t \t</div>\n \t \t</div>\n \t</div>\n</section>",
      "about": "<section id=\"about\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t<div class=\"grid md:grid-cols-2 gap-16 md:gap-24 items-center\">\n \t \t<div class=\"order-2 md:order-1\">\n \t \t \t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-12 tracking-tighter leading-[0.9]\">\n \t \t \t \tABOUT<br/>THE<br/>STUDIO\n \t \t \t</h2>\n \t \t \t<div class=\"space-y-6 text-lg md:text-xl leading-relaxed\">\n \t \t \t \t<p>\n \t \t \t \t \tWith over a decade of experience in visual storytelling, I create compelling imagery\n \t \t \t \t \tthat resonates with audiences and elevates brands.\n \t \t \t \t</p>\n \t \t \t \t<p>\n \t \t \t \t \tMy approach combines minimalist aesthetics with bold typography and striking composition,\n \t \t \t \t \tresulting in work that is both timeless and contemporary.\n \t \t \t \t</p>\n \t \t \t \t<p>\n \t \t \t \t \tBased between New York and Berlin, I collaborate with clients worldwide who share\n \t \t \t \t \ta passion for exceptional design and authentic visual communication.\n \t \t \t \t</p>\n \t \t \t</div>\n \t \t \t<div class=\"mt-16 flex gap-8\">\n \t \t \t \t<div>\n \t \t \t \t \t<div class=\"text-5xl font-bold tracking-tighter\">10+</div>\n \t \t \t \t \t<div class=\"text-sm tracking-widest mt-2\">YEARS</div>\n \t \t \t \t</div>\n \t \t \t \t<div>\n \t \t \t \t \t<div class=\"text-5xl font-bold tracking-tighter\">200+</div>\n \t \t \t \t \t<div class=\"text-sm tracking-widest mt-2\">PROJECTS</div>\n \t \t \t \t</div>\n \t \t \t \t<div>\n \t \t \t \t \t<div class=\"text-5xl font-bold tracking-tighter\">50+</div>\n \t \t \t \t \t<div class=\"text-sm tracking-widest mt-2\">CLIENTS</div>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"order-1 md:order-2\">\n \t \t \t<img\n \t \t \t \tsrc=\"https://images.pexels.com/photos/2787341/pexels-photo-2787341.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t \t \t \talt=\"Portrait\"\n \t \t \t \tclass=\"w-full h-[80vh] object-cover\"\n \t \t \t/>\n \t \t</div>\n \t</div>\n</section>",
      "faq": "<section id=\"faq\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto border-t border-black\">\n \t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-24 tracking-tighter\">\n \t \tFREQUENTLY<br/>ASKED\n \t</h2>\n \t<div class=\"space-y-0 border-t border-black\">\n \t \t<div class=\"border-b border-black\">\n \t \t \t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t \t \t \t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t \t \t \t \tWhat services do you offer?\n \t \t \t \t</span>\n \t \t \t \t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t \t \t</button>\n \t \t \t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t \t \t \t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t \t \t \t \tI specialize in photography, graphic design, and videography for creative brands and individuals who value bold, minimalist aesthetics.\n \t \t \t \t</p>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"border-b border-black\">\n \t \t \t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t \t \t \t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t \t \t \t \tHow long does a typical project take?\n \t \t \t \t</span>\n \t \t \t \t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t \t \t</button>\n \t \t \t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t \t \t \t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t \t \t \t \tProject timelines vary depending on scope, but most projects are completed within 2-4 weeks from initial consultation to final delivery.\n \t \t \t \t</p>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"border-b border-black\">\n \t \t \t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t \t \t \t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t \t \t \t \tDo you work with international clients?\n \t \t \t \t</span>\n \t \t \t \t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t \t \t</button>\n \t \t \t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t \t \t \t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t \t \t \t \tAbsolutely. I work with clients globally and can accommodate different time zones and communication preferences.\n \t \t \t \t</p>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"border-b border-black\">\n \t \t \t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t \t \t \t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t \t \t \t \tWhat is your creative process?\n \t \t \t \t</span>\n \t \t \t \t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t \t \t</button>\n \t \t \t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t \t \t \t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t \t \t \t \tI begin with understanding your vision, followed by research and conceptualization, then move into execution with regular check-ins to ensure alignment.\n \t \t \t \t</p>\n \t \t \t</div>\n \t \t</div>\n \t</div>\n</section>",
      "footer": "<footer id=\"contact\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto border-t border-black\">\n \t<div class=\"space-y-16\">\n \t \t<h2 class=\"text-[10vw] md:text-[8vw] font-bold tracking-tighter leading-[0.9]\">\n \t \t \tLET'S<br/>\n \t \t \tWORK<br/>\n \t \t \tTOGETHER\n \t \t</h2>\n \t \t<div class=\"flex flex-col md:flex-row justify-between gap-12 md:gap-24\">\n \t \t \t<div class=\"space-y-4\">\n \t \t \t \t<div class=\"text-sm tracking-widest\">EMAIL</div>\n \t \t \t \t<a href=\"mailto:hello@studio.com\" class=\"text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t \t \t \t \thello@studio.com\n \t \t \t \t</a>\n \t \t \t</div>\n \t \t \t<div class=\"space-y-4\">\n \t \t \t \t<div class=\"text-sm tracking-widest\">SOCIAL</div>\n \t \t \t \t<div class=\"space-y-2\">\n \t \t \t \t \t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t \t \t \t \t \tInstagram\n \t \t \t \t \t</a>\n \t \t \t \t \t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t \t \t \t \t \tBehance\n \t \t \t \t \t</a>\n \t \t \t \t \t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t \t \t \t \t \tLinkedIn\n \t \t \t \t \t</a>\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t \t<div class=\"space-y-4\">\n \t \t \t \t<div class=\"text-sm tracking-widest\">LOCATION</div>\n \t \t \t \t<div class=\"text-2xl md:text-3xl font-bold\">\n \t \t \t \t \tNew York, NY<br/>\n \t \t \t \t \tBerlin, DE\n \t \t \t \t</div>\n \t \t \t</div>\n \t \t</div>\n \t \t<div class=\"pt-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm tracking-widest\">\n \t \t \t<div>В© 2024 STUDIO. ALL RIGHTS RESERVED.</div>\n \t \t \t<div class=\"flex gap-8\">\n \t \t \t \t<a href=\"#\" class=\"hover:opacity-50 transition-opacity\">PRIVACY</a>\n \t \t \t \t<a href=\"#\" class=\"hover:opacity-50 transition-opacity\">TERMS</a>\n \t \t \t</div>\n \t \t</div>\n \t</div>\n</footer>",
      "javascript": "<script>\n \tdocument.addEventListener('DOMContentLoaded', () => {\n \t \tconst buttons = document.querySelectorAll('.faq-btn');\n \t \tconst answers = document.querySelectorAll('.faq-answer');\n \t \tconst symbols = document.querySelectorAll('.faq-symbol');\n \t \tbuttons.forEach((button, index) => {\n \t \t \tbutton.addEventListener('click', () => {\n \t \t \t \tconst answer = answers[index];\n \t \t \t \tconst symbol = symbols[index];\n \t \t \t \tconst isCurrentlyOpen = !answer.classList.contains('max-h-0');\n \t \t \t \tanswers.forEach(a => {\n \t \t \t \t \ta.classList.remove('max-h-96', 'pb-8');\n \t \t \t \t \ta.classList.add('max-h-0');\n \t \t \t \t});\n \t \t \t \tsymbols.forEach(s => s.textContent = '+');\n \t \t \t \tif (!isCurrentlyOpen) {\n \t \t \t \t \tanswer.classList.remove('max-h-0');\n \t \t \t \t \tanswer.classList.add('max-h-96', 'pb-8');\n \t \t \t \t \tsymbol.textContent = 'в€’';\n \t \t \t \t}\n \t \t \t});\n \t \t});\n \t});\n</script>"
    },
    "full_html_template": "<!DOCTYPE html>\n<html lang=\"en\" class=\"scroll-smooth\">\n<head>\n \t<meta charset=\"UTF-8\">\n \t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n \t<title>STUDIO | Creative Director & Visual Artist</title>\n \t<script src=\"https://cdn.tailwindcss.com\"></script>\n</head>\n <body class=\"bg-white text-black font-sans\">\n \t<header class=\"fixed top-0 left-0 right-0 z-50 bg-white border-b border-black\">\n \t\t<nav class=\"max-w-[1800px] mx-auto px-8 md:px-16 py-8 flex justify-between items-center\">\n \t\t\t<div class=\"text-2xl font-bold tracking-tighter\">STUDIO</div>\n \t\t\t<div class=\"flex gap-12 text-sm tracking-wider\">\n \t\t\t\t<a href=\"#work\" class=\"hover:opacity-50 transition-opacity\">WORK</a>\n \t\t\t\t<a href=\"#about\" class=\"hover:opacity-50 transition-opacity\">ABOUT</a>\n \t\t\t\t<a href=\"#contact\" class=\"hover:opacity-50 transition-opacity\">CONTACT</a>\n \t\t\t</div>\n \t\t</nav>\n\t</header>\n \t<section class=\"pt-48 pb-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t\t<div class=\"space-y-8\">\n \t\t\t<h1 class=\"text-[12vw] md:text-[10vw] lg:text-[8vw] font-bold leading-[0.9] tracking-tighter\">\n \t\t\t\tCREATIVE<br/>\n \t\t\t\tDIRECTOR &<br/>\n \t\t\t\tVISUAL<br/>\n \t\t\t\tARTIST\n \t\t\t</h1>\n \t\t\t<p class=\"text-xl md:text-2xl max-w-2xl ml-auto text-right tracking-wide\">\n \t\t\t\tCrafting bold visual narratives through photography, design, and motion\n \t\t\t</p>\n \t\t</div>\n\t</section>\n \t<section id=\"work\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t\t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-24 tracking-tighter\">\n \t\t\tSELECTED<br/>WORKS\n \t\t</h2>\n \t\t<div class=\"space-y-32\">\n \t\t\t<div class=\"group cursor-pointer\">\n \t\t\t\t<div class=\"relative overflow-hidden\">\n \t\t\t\t\t<img\n \t\t\t\t\t\tsrc=\"https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t\t\t\t\t\talt=\"URBAN LANDSCAPES\"\n \t\t\t\t\t\tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t\t\t\t\t/>\n \t\t\t\t\t<div class=\"absolute top-8 left-8 text-white\">\n \t\t\t\t\t\t<span class=\"text-sm tracking-widest\">01</span>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"mt-8 flex justify-between items-end\">\n \t\t\t\t\t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">URBAN LANDSCAPES</h3>\n \t\t\t\t\t<span class=\"text-lg tracking-widest\">Photography</span>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"group cursor-pointer\">\n \t\t\t\t<div class=\"relative overflow-hidden\">\n \t\t\t\t\t<img\n \t\t\t\t\t\tsrc=\"https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t\t\t\t\t\talt=\"EDITORIAL DESIGN\"\n \t\t\t\t\t\tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t\t\t\t\t/>\n \t\t\t\t\t<div class=\"absolute top-8 left-8 text-white\">\n \t\t\t\t\t\t<span class=\"text-sm tracking-widest\">02</span>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"mt-8 flex justify-between items-end\">\n \t\t\t\t\t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">EDITORIAL DESIGN</h3>\n \t\t\t\t\t<span class=\"text-lg tracking-widest\">Design</span>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"group cursor-pointer\">\n \t\t\t\t<div class=\"relative overflow-hidden\">\n \t\t\t\t\t<img\n \t\t\t\t\t\tsrc=\"https://images.pexels.com/photos/1294875/pexels-photo-1294875.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t\t\t\t\t\talt=\"MOTION STUDY\"\n \t\t\t\t\t\tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t\t\t\t\t/>\n \t\t\t\t\t<div class=\"absolute top-8 left-8 text-white\">\n \t\t\t\t\t\t<span class=\"text-sm tracking-widest\">03</span>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"mt-8 flex justify-between items-end\">\n \t\t\t\t\t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">MOTION STUDY</h3>\n \t\t\t\t\t<span class=\"text-lg tracking-widest\">Video</span>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"group cursor-pointer\">\n \t\t\t\t<div class=\"relative overflow-hidden\">\n \t\t\t\t\t<img\n \t\t\t\t\t\tsrc=\"https://images.pexels.com/photos/1707215/pexels-photo-1707215.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t\t\t\t\t\talt=\"BRAND IDENTITY\"\n \t\t\t\t\t\tclass=\"w-full h-[70vh] object-cover transition-transform duration-700 group-hover:scale-105\"\n \t\t\t\t\t/>\n \t\t\t\t\t<div class=\"absolute top-8 left-8 text-white\">\n \t\t\t\t\t\t<span class=\"text-sm tracking-widest\">04</span>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"mt-8 flex justify-between items-end\">\n \t\t\t\t\t<h3 class=\"text-5xl md:text-6xl font-bold tracking-tighter\">BRAND IDENTITY</h3>\n \t\t\t\t\t<span class=\"text-lg tracking-widest\">Design</span>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"about\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto\">\n \t\t<div class=\"grid md:grid-cols-2 gap-16 md:gap-24 items-center\">\n \t\t\t<div class=\"order-2 md:order-1\">\n \t\t\t\t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-12 tracking-tighter leading-[0.9]\">\n \t\t\t\t\tABOUT<br/>THE<br/>STUDIO\n \t\t\t\t</h2>\n \t\t\t\t<div class=\"space-y-6 text-lg md:text-xl leading-relaxed\">\n \t\t\t\t\t<p>\n \t\t\t\t\t\tWith over a decade of experience in visual storytelling, I create compelling imagery\n \t\t\t\t\t\tthat resonates with audiences and elevates brands.\n \t\t\t\t\t</p>\n \t\t\t\t\t<p>\n \t\t\t\t\t\tMy approach combines minimalist aesthetics with bold typography and striking composition,\n \t\t\t\t\t\tresulting in work that is both timeless and contemporary.\n \t\t\t\t\t</p>\n \t\t\t\t\t<p>\n \t\t\t\t\t\tBased between New York and Berlin, I collaborate with clients worldwide who share\n \t\t\t\t\t\ta passion for exceptional design and authentic visual communication.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"mt-16 flex gap-8\">\n \t\t\t\t\t<div>\n \t\t\t\t\t\t<div class=\"text-5xl font-bold tracking-tighter\">10+</div>\n \t\t\t\t\t\t<div class=\"text-sm tracking-widest mt-2\">YEARS</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div>\n \t\t\t\t\t\t<div class=\"text-5xl font-bold tracking-tighter\">200+</div>\n \t\t\t\t\t\t<div class=\"text-sm tracking-widest mt-2\">PROJECTS</div>\n \t\t\t\t\t</div>\n \t\t\t\t\t<div>\n \t\t\t\t\t\t<div class=\"text-5xl font-bold tracking-tighter\">50+</div>\n \t\t\t\t\t\t<div class=\"text-sm tracking-widest mt-2\">CLIENTS</div>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"order-1 md:order-2\">\n \t\t\t\t<img\n \t\t\t\t\tsrc=\"https://images.pexels.com/photos/2787341/pexels-photo-2787341.jpeg?auto=compress&cs=tinysrgb&w=1200\"\n \t\t\t\t\talt=\"Portrait\"\n \t\t\t\t\tclass=\"w-full h-[80vh] object-cover\"\n \t\t\t\t/>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<section id=\"faq\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto border-t border-black\">\n \t\t<h2 class=\"text-[8vw] md:text-[6vw] font-bold mb-24 tracking-tighter\">\n \t\t\tFREQUENTLY<br/>ASKED\n \t\t</h2>\n \t\t<div class=\"space-y-0 border-t border-black\">\n \t\t\t<div class=\"border-b border-black\">\n \t\t\t\t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t\t\t\t\t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t\t\t\t\t\tWhat services do you offer?\n \t\t\t\t\t</span>\n \t\t\t\t\t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t\t\t\t</button>\n \t\t\t\t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t\t\t\t\t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t\t\t\t\t\tI specialize in photography, graphic design, and videography for creative brands and individuals who value bold, minimalist aesthetics.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"border-b border-black\">\n \t\t\t\t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t\t\t\t\t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t\t\t\t\t\tHow long does a typical project take?\n \t\t\t\t\t</span>\n \t\t\t\t\t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t\t\t\t</button>\n \t\t\t\t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t\t\t\t\t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t\t\t\t\t\tProject timelines vary depending on scope, but most projects are completed within 2-4 weeks from initial consultation to final delivery.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"border-b border-black\">\n \t\t\t\t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t\t\t\t\t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t\t\t\t\t\tDo you work with international clients?\n \t\t\t\t\t</span>\n \t\t\t\t\t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t\t\t\t</button>\n \t\t\t\t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t\t\t\t\t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t\t\t\t\t\tAbsolutely. I work with clients globally and can accommodate different time zones and communication preferences.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"border-b border-black\">\n \t\t\t\t<button class=\"w-full py-8 flex justify-between items-center text-left hover:opacity-50 transition-opacity faq-btn\">\n \t\t\t\t\t<span class=\"text-2xl md:text-3xl font-bold tracking-tighter pr-8\">\n \t\t\t\t\t\tWhat is your creative process?\n \t\t\t\t\t</span>\n \t\t\t\t\t<span class=\"text-3xl font-light flex-shrink-0 faq-symbol\">+</span>\n \t\t\t\t</button>\n \t\t\t\t<div class=\"max-h-0 overflow-hidden transition-all duration-500 faq-answer\">\n \t\t\t\t\t<p class=\"text-lg md:text-xl leading-relaxed max-w-4xl\">\n \t\t\t\t\t\tI begin with understanding your vision, followed by research and conceptualization, then move into execution with regular check-ins to ensure alignment.\n \t\t\t\t\t</p>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</section>\n \t<footer id=\"contact\" class=\"py-32 px-8 md:px-16 max-w-[1800px] mx-auto border-t border-black\">\n \t\t<div class=\"space-y-16\">\n \t\t\t<h2 class=\"text-[10vw] md:text-[8vw] font-bold tracking-tighter leading-[0.9]\">\n \t\t\t\tLET'S<br/>\n \t\t\t\tWORK<br/>\n \t\t\t\tTOGETHER\n \t\t\t</h2>\n \t\t\t<div class=\"flex flex-col md:flex-row justify-between gap-12 md:gap-24\">\n \t\t\t\t<div class=\"space-y-4\">\n \t\t\t\t\t<div class=\"text-sm tracking-widest\">EMAIL</div>\n \t\t\t\t\t<a href=\"mailto:hello@studio.com\" class=\"text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t\t\t\t\t\thello@studio.com\n \t\t\t\t\t</a>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"space-y-4\">\n \t\t\t\t\t<div class=\"text-sm tracking-widest\">SOCIAL</div>\n \t\t\t\t\t<div class=\"space-y-2\">\n \t\t\t\t\t\t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t\t\t\t\t\t\tInstagram\n \t\t\t\t\t\t</a>\n \t\t\t\t\t\t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t\t\t\t\t\t\tBehance\n \t\t\t\t\t\t</a>\n \t\t\t\t\t\t<a href=\"#\" class=\"block text-2xl md:text-3xl font-bold hover:opacity-50 transition-opacity\">\n \t\t\t\t\t\t\tLinkedIn\n \t\t\t\t\t\t</a>\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t\t<div class=\"space-y-4\">\n \t\t\t\t\t<div class=\"text-sm tracking-widest\">LOCATION</div>\n \t\t\t\t\t<div class=\"text-2xl md:text-3xl font-bold\">\n \t\t\t\t\t\tNew York, NY<br/>\n \t\t\t\t\t\tBerlin, DE\n \t\t\t\t\t</div>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t\t<div class=\"pt-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm tracking-widest\">\n \t\t\t\t<div>В© 2024 STUDIO. ALL RIGHTS RESERVED.</div>\n \t\t\t\t<div class=\"flex gap-8\">\n \t\t\t\t\t<a href=\"#\" class=\"hover:opacity-50 transition-opacity\">PRIVACY</a>\n \t\t\t\t\t<a href=\"#\" class=\"hover:opacity-50 transition-opacity\">TERMS</a>\n \t\t\t\t</div>\n \t\t\t</div>\n \t\t</div>\n\t</footer>\n \t<script>\n \t\tdocument.addEventListener('DOMContentLoaded', () => {\n \t\t\tconst buttons = document.querySelectorAll('.faq-btn');\n \t\t\tconst answers = document.querySelectorAll('.faq-answer');\n \t\t\tconst symbols = document.querySelectorAll('.faq-symbol');\n \t\t\tbuttons.forEach((button, index) => {\n \t\t\t\tbutton.addEventListener('click', () => {\n \t\t\t\t\tconst answer = answers[index];\n \t\t\t\t\tconst symbol = symbols[index];\n \t\t\t\t\tconst isCurrentlyOpen = !answer.classList.contains('max-h-0');\n \t\t\t\t\tanswers.forEach(a => {\n \t\t\t\t\t\ta.classList.remove('max-h-96', 'pb-8');\n \t\t\t\t\t\ta.classList.add('max-h-0');\n \t\t\t\t\t});\n \t\t\t\t\tsymbols.forEach(s => s.textContent = '+');\n \t\t\t\t\tif (!isCurrentlyOpen) {\n \t\t\t\t\t\tanswer.classList.remove('max-h-0');\n \t\t\t\t\t\tanswer.classList.add('max-h-96', 'pb-8');\n \t\t\t\t\t\tsymbol.textContent = 'в€’';\n \t\t\t\t\t}\n \t\t\t\t});\n \t\t\t});\n \t\t});\n\t</script>\n</body>\n</html>"
  }
},
         comments: {
            "c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                comment: "Absolutely stunning design! The soft color palette and elegant typography perfectly capture the essence of beauty and sophistication. This template would be perfect for my makeup artistry business.",
                templateId: "5c7d8f0e-3a9b-4c2d-9e1f-6a4b3c8d2e7a",
                email: "peter@abv.bg",
                _createdOn: 1733500800000
            },
            "d2e3f4g5-h6i7-j8k9-l0m1-n2o3p4q5r6s7": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                comment: "Love the minimalist approach and the beautiful gradient backgrounds. The FAQ section is particularly well-designed. Great work on this template!",
                templateId: "5c7d8f0e-3a9b-4c2d-9e1f-6a4b3c8d2e7a",
                email: "john@abv.bg",
                _createdOn: 1733587200000
            },
            "e3f4g5h6-i7j8-k9l0-m1n2-o3p4q5r6s7t8": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                comment: "This crypto platform design is incredible! The dark theme with blue and purple gradients creates a perfect futuristic vibe. The animations and interactive elements are top-notch.",
                templateId: "7b9a2c4f-1d5e-4b6c-8a3d-2f1e0g3h4i5j",
                email: "peter@abv.bg",
                _createdOn: 1733673600000
            },
            "f4g5h6i7-j8k9-l0m1-n2o3-p4q5r6s7t8u9": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                comment: "Perfect for a fintech startup! The feature cards and pricing section are very well structured. The AI analytics icon is a nice touch. Highly recommend this template.",
                templateId: "7b9a2c4f-1d5e-4b6c-8a3d-2f1e0g3h4i5j",
                email: "john@abv.bg",
                _createdOn: 1733760000000
            },
            "g5h6i7j8-k9l0-m1n2-o3p4-q5r6s7t8u9v0": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                comment: "The black and yellow color scheme is so bold and energetic! Perfect for a gym website. The trainer cards and membership plans are very professional. This is exactly what I was looking for!",
                templateId: "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
                email: "peter@abv.bg",
                _createdOn: 1733846400000
            },
            "h6i7j8k9-l0m1-n2o3-p4q5-r6s7t8u9v0w1": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                comment: "IRONPULSE is an amazing fitness template! The aggressive design with heavy fonts really motivates you to work out. The pricing cards are clear and the FAQ section is well organized.",
                templateId: "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
                email: "john@abv.bg",
                _createdOn: 1733932800000
            },
            "i7j8k9l0-m1n2-o3p4-q5r6-s7t8u9v0w1x2": {
                _ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
                comment: "This minimalist portfolio is pure elegance! The black and white aesthetic with bold typography is timeless. The work showcase section with hover effects is beautifully executed.",
                templateId: "9f8e7d6c-5b4a-3c2d-1e0f-9g8h7i6j5k4l",
                email: "peter@abv.bg",
                _createdOn: 1734019200000
            },
            "j8k9l0m1-n2o3-p4q5-r6s7-t8u9v0w1x2y3": {
                _ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
                comment: "Perfect for creative professionals! The large typography and clean layout really let the work speak for itself. The FAQ accordion is smooth and the contact section is well designed.",
                templateId: "9f8e7d6c-5b4a-3c2d-1e0f-9g8h7i6j5k4l",
                email: "john@abv.bg",
                _createdOn: 1734105600000
            }
        }
    };
    var rules$1 = {
        users: {
            ".create": false,
            ".read": [
                "Owner"
            ],
            ".update": false,
            ".delete": false
        }
    };
    var settings = {
        identity: identity,
        protectedData: protectedData,
        seedData: seedData,
        rules: rules$1
    };

    const plugins = [
        storage(settings),
        auth(settings),
        util$2(),
        rules(settings)
    ];

    const server = http__default['default'].createServer(requestHandler(plugins, services));

    const port = 3030;
    server.listen(port);
    console.log(`Server started on port ${port}. You can make requests to http://localhost:${port}/`);
    console.log(`Admin panel located at http://localhost:${port}/admin`);

    var softuniPracticeServer = {

    };

    return softuniPracticeServer;

})));
