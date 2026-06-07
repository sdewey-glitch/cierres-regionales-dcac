module.exports = {
    apps: [
        {
            name: 'cierres-server',
            script: 'src/server.js',
            cwd: 'c:\\Users\\Admin\\.gemini\\antigravity\\scratch\\premium-landing-page\\CIERRES PAGINAWEB',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 2000,
            env: {
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2-error.log',
            out_file: 'logs/pm2-out.log',
        },
    ],
};
