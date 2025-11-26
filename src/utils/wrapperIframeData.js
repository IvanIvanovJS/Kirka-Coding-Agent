export default function wrapperIframeData(data) {
    return (
        `
            <html>
            <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style> html::-webkit-scrollbar,
                    body::-webkit-scrollbar {
                            display: none;
                        }</style>
            </head>
            <body>
             ${data}
            </body>
            </html>
            `
    )
}
