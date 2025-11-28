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
                           </style>
            </head>
            <body ${bodyClass}>
             ${data}
             <script>
                document.addEventListener('DOMContentLoaded', () => {
        		    const anchorLinks = document.querySelectorAll('a[href^="#"]'); 

    				    anchorLinks.forEach(link => {
        				    link.addEventListener('click', function(event) {
                				event.preventDefault(); 
                       				const targetId = this.getAttribute('href').substring(1); 
            					const targetElement = document.getElementById(targetId);

            						if (targetElement) {
                               				targetElement.scrollIntoView({ 
                    					behavior: 'smooth', 
                    					block: 'start' 
                				        });
            				        }
        			    });
    			    });
		        });
            </script>
            </body>
            </html>
            `
    )
}
