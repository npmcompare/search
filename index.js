'use strict';

const validate = require("validate-npm-package-name");
const cors = require('cors')
const app = require('express')();
const got = require('got');
const memoize = require('memoizee');
const config = require('rc')('npmcompare');

const search = memoize(q => {
    return new Promise((resolve, reject) => {
        console.log(`Search: ${q}`);
        let url = `https://ac.cnstrc.com/autocomplete/${q}?autocomplete_key=${config.npm_autocomplete_key}&query=${q}`;
        got(url, {json: true})
            .then(result => {
                let i = result.body.sections.packages.length;
                let results = result.body.sections.packages.map(pkg => {
                    return {
                        name: pkg.value,
                        description: pkg.data.description,
                        priority: --i
                    };
                });
                resolve(results);
            }, reject);
    });
}, {
    promise: true,
    maxAge: parseInt(config.search_cache_timeout || 6 * 60 * 60 * 1000) // Default 6 hours
});

const whitelist = ['http://npmcompare.com', 'https://npmcompare.com', 'http://localhost:3000'];
const corsOptions = {
    origin: (origin, callback) => {
        callback(null, whitelist.indexOf(origin) !== -1);
    }
};

app.get('/', (req, res) => res.send('npmcompare search'));

app.get('/:query', cors(corsOptions), (req, res) => {
    let q = req.params.query.toLowerCase();
    let valid = validate(q);
    if (!q || !valid.validForNewPackages) return res.status(400).json('invalid package name provided');

    search(req.params.query.toLowerCase()).then(results => {
        res.json(results);
    }, err => {
        res.status(400).json('an error occurred');
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Search microservice listening on port ${port}`));
