import React from 'react';

export const supportedSocialConnectors = [
    {
        id: 'google', 
        name: 'Google', 
        logos: { default: <img src={'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/2048px-Google_%22G%22_Logo.svg.png'} alt="Google" />},
        extensionIsInstalled: () => true
    },
    {
        id: 'facebook', 
        name: 'Facebook', 
        logos: { default: <img src={'https://cdn2.iconfinder.com/data/icons/social-icons-33/128/Facebook-512.png'} alt="Facebook" />},
        extensionIsInstalled: () => true
    },
    {
        id: 'twitter', 
        name: 'Twitter', 
        logos: { default: <img src={'https://cdn3.iconfinder.com/data/icons/inficons/512/twitter.png'} alt="Twitter" />},
        extensionIsInstalled: () => true
    },
    {
        id: 'discord', 
        name: 'Discord', 
        logos: { default: <img src={'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/91_Discord_logo_logos-512.png'} alt="Discord" />},
        extensionIsInstalled: () => true
    },
    {
        id: 'github', 
        name: 'Github', 
        logos: { default: <img src={'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/142_Github_logo_logos-512.png'} alt="Github" />},
        extensionIsInstalled: () => true
    },
    {
        id: 'twitch', 
        name: 'Twitch', 
        logos: { default: <img src={'https://cdn4.iconfinder.com/data/icons/logos-brands-7/512/twitch-1024.png'} alt="Twitch" />},
        extensionIsInstalled: () => true
    },
]
