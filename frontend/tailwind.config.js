// import forms from '@tailwindcss/forms'
// import typography from '@tailwindcss/typography'
// import lineClamp from '@tailwindcss/line-clamp'

// /** @type {import('tailwindcss').Config} */
// export default {
//     darkMode: 'class',
//     content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
//     theme: {
//         extend: {
//             colors: {
//                 background: "#fdfbf7",
//                 foreground: "#111827",
//                 "muted-foreground": "#6b7280",
//                 brand: {
//                     600: "#52A8BD",
//                     700: "#007c85",
//                 },
//             },
//         },
//     }
//     ,
//     plugins: [forms, typography, lineClamp, require("tailwindcss-animate")],
// }

import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'
import lineClamp from '@tailwindcss/line-clamp'

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                background: "#fdfbf7",
                foreground: "#111827",
                "muted-foreground": "#6b7280",

                brand: {
                    600: "#52A8BD",
                    700: "#007c85",
                },

                primary: "#3B82F6",                 // blue typical primary
                "primary-foreground": "#ffffff",    // white text on primary

                secondary: "#EA6B3E",                // your orange as secondary background
                "secondary-foreground": "#ffffff",  // white text on secondary

                destructive: "#DC2626",              // red for destructive
                "destructive-foreground": "#ffffff",// white text on destructive

                input: "#d1d5db",                    // gray border for inputs (for outline variant)
                accent: "#f3f4f6",                   // light gray hover background for ghost/outline

                "accent-foreground": "#111827",      // dark text on accent background

                ring: "#2563eb",                    // focus ring color (blue)
                "ring-offset-background": "#fdfbf7",// ring offset color matches background
            },
        },
    },
    plugins: [forms, typography, lineClamp, require("tailwindcss-animate")],
}
