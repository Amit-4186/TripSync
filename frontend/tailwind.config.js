import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'
import lineClamp from '@tailwindcss/line-clamp'

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'ui-sans-serif', 'Segoe UI', 'Roboto', 'Arial', 'Noto Sans', 'sans-serif'],
            },
            colors: {
                brand: {
                    DEFAULT: '#2563eb',
                    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                    800: '#1e40af', 900: '#1e3a8a',
                },
            },
            boxShadow: {
                card: '0 2px 10px rgba(0,0,0,0.06)',
            },
        },
    },
    plugins: [forms, typography, lineClamp],
}
