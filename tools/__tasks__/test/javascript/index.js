const execa = require('execa');
const split = require('split');
// eslint-disable-next-line import/no-unassigned-import
require('any-observable/register/rxjs-all');
const Observable = require('any-observable');
const streamToObservable = require('stream-to-observable');

const exec = (cmd, args) => {
    const cp = execa(cmd, args);

    return Observable.merge(
        streamToObservable(cp.stdout.pipe(split()), { await: cp }),
        streamToObservable(cp.stderr.pipe(split()), { await: cp })
    ).filter(Boolean);
};

const legacyTests = ['commercial', 'common', 'facia'].map(set => ({
    description: `Run ${set} tests (legacy)`,
    task: () =>
        exec('karma', [
            'start',
            `./static/test/javascripts-legacy/conf/${set}.js`,
            '--single-run',
        ]),
}));

module.exports = {
    description: 'Test JS app',
    task: [
        require('../../compile/inline-svgs'),
        require('../../compile/javascript/clean'),
        require('../../compile/javascript/copy'),
        require('../../compile/javascript/babel'),
        {
            description: 'Run tests',
            task: [
                {
                    description: 'Main app',
                    task: () => exec('jest', ['static/src/javascripts']),
                },
                {
                    description: 'Test eslint rules',
                    task: () =>
                        exec('jest', [
                            'tools/eslint-plugin-guardian-frontend/__tests__/*',
                        ]),
                },
                ...legacyTests,
            ],
            concurrent: true,
        },
    ],
};
