const winston = require('winston');
 
const {
    combine,
    timestamp,
    label,
    printf
} = winston.format;

const myFormat = printf(({
    level,
    message,
    timestamp
}) => {
    return `${timestamp} [${level}] ${message}`;
});




const Logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        timestamp(),
        myFormat
    ),
    transports: [
    new winston.transports.File({
            filename: 'error.log',
            level: 'info'
        }),
 
    ]
});


exports.log = function (level, message) {
    Logger .log(level, message);
}
