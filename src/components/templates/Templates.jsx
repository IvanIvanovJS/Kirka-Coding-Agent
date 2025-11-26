import useFetch from '../../hooks/useFetch';
import styles from './Templates.module.css';

export default function Templates() {

    const hero = "<section class=\"relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ddb7b5] via-[#d8a7a7] to-[#c99595]\">\n  <div class=\"absolute inset-0 opacity-10\">\n    <div class=\"absolute top-20 left-10 w-72 h-72 bg-[#b78e5c] rounded-full blur-3xl\"></div>\n    <div class=\"absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl\"></div>\n  </div>\n  <div class=\"relative z-10 text-center px-6 max-w-4xl\">\n    <div class=\"mb-8 flex justify-center\">\n      <svg class=\"w-16 h-16 text-[#b78e5c]\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n        <path d=\"M17.5 12c0 .8-.3 1.5-.9 2-.5.5-1.2.8-2 .9v1.6c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.6c-.8-.1-1.5-.4-2-.9-.6-.5-.9-1.2-.9-2s.3-1.5.9-2c.5-.5 1.2-.8 2-.9V7.5c0-.3.2-.5.5-.5s.5.2.5.5v1.6c.8.1 1.5.4 2 .9.6.5.9 1.2.9 2zm-3.5-.5c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z\"/>\n      </svg>\n    </div>\n    <h1 class=\"text-6xl md:text-7xl font-light text-white mb-6 tracking-wide\">\n      Beauty is an <span class=\"italic font-serif\">Art</span>\n    </h1>\n    <p class=\"text-xl md:text-2xl text-white/90 mb-12 font-light tracking-wide max-w-2xl mx-auto leading-relaxed\">\n      Elevate your natural beauty with artistry and elegance. Boutique makeup services for your most special moments.\n    </p>\n    <div class=\"flex flex-col sm:flex-row gap-4 justify-center items-center\">\n      <button class=\"bg-[#b78e5c] text-white px-10 py-4 rounded-full hover:bg-[#a67d4e] transition-all shadow-xl hover:shadow-2xl text-lg font-light tracking-wide\">\n        Book Your Glam Session\n      </button>\n      <button class=\"bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 px-10 py-4 rounded-full hover:bg-white/30 transition-all text-lg font-light tracking-wide\">\n        View Portfolio\n      </button>\n    </div>\n  </div>\n  <div class=\"absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce\">\n    <svg class=\"w-6 h-6 text-white/60\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">\n      <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/>\n    </svg>\n  </div>\n</section>";

    const iFrameInputSrc = `
            <html>
            <head>
            <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
             ${hero}
            </body>
            </html>
            `
    const { data, isLoading, error } = useFetch('http://localhost:3030/jsonstore/templates', {})

    const transformedData = Object.values(data);

    return (
        <div className={styles.templatesContainer}>
            <h2 className={styles.title}>Templates</h2>

            <div className={styles.templatesGrid}>
                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>E-Commerce Store</h3>
                    <p className={styles.cardDescription}>
                        A modern e-commerce template with product listings, shopping cart, and checkout flow.
                    </p>
                </div>

                <div className={styles.templateCard}>
                    <div className={styles.previewWrapper}>
                        <iframe
                            className={styles.previewFrame}
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={iFrameInputSrc}
                        />
                    </div>
                    <h3 className={styles.cardTitle}>Portfolio Website</h3>
                    <p className={styles.cardDescription}>
                        Showcase your work with this elegant portfolio template featuring project galleries and contact forms.
                    </p>
                </div>


                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>Business Landing</h3>
                    <p className={styles.cardDescription}>
                        Professional landing page template perfect for startups and businesses to showcase their services.
                    </p>
                </div>

                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>Blog Platform</h3>
                    <p className={styles.cardDescription}>
                        Clean and minimal blog template with article listings, categories, and reading experience optimized.
                    </p>
                </div>

            </div>
        </div>

    )
}