module.exports = {
  content: ['*.html'],
  theme: {
    screens: {
      'm2': '375px',
      'm3': '425px',      
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'akayik':{
          900: '#1e4489',
        } 
      },
      keyframes: {
        slide: {
          '0%' : {transform: 'translate(0)'},
          '100%' : {transform: 'translate(8rem)'},
        },
        slideLarge: {
          '0%' : {transform: 'translate(0)'},
          '100%' : {transform: 'translate(10rem)'},
        }
      },
      animation: {
        'bar' : 'slide 1000ms linear alternate infinite',
        'barLarge' : 'slideLarge 1000ms linear alternate infinite',
      }
    }
  },
  plugins: [],
}
