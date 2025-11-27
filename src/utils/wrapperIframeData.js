export default function wrapperIframeData(data, bodyClass) {
    return (
        `
            <html>
            <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style> html::-webkit-scrollbar,
                    body::-webkit-scrollbar {
                            display: none;
                        }
                    a{
                    pointer-events: none;
                    }        </style>
            </head>
            <body ${bodyClass}>
             ${data}
            </body>
            </html>
            `
    )
}
