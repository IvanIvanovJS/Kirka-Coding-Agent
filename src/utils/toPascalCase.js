export default function toPascalCase(str) {
    return str
        .match(/[a-zA-Z0-9]+/g)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}