const express = require('express');

const app = express();

app.get('/', (request, response) => {
    response.send('Welcome to my Node.js server!');
});

app.get('/about', (request, response) => {
    response.status(200).json({
        name: 'Gurram Shravana Manikanta',
        'Registration number': "252U1R6094",
        section: 'CSE AIML 2B'
    });
});

app.get('/time', (request, response) => {
    const currentDate = new Date();

    response.status(200).send(currentDate.toString());
});

app.use((request, response) => {
    response.status(404).send('404 - Page Not Found');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});