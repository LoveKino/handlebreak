'use strict';

/**
 * when run a couple of tasks on the page, it may refresh. At this moment, we need find the break point of tasks and continue to deal the tasks.
 *
 * TODO compability
 */

let id = v => v;

const local = (typeof window === 'object' && window && window.localStorage) || {};

let defMemory = {
    set: (key, value) => {
        local[key] = value;
    },
    get: (key) => {
        return local[key];
    }
};

module.exports = (memory) => {
    memory = memory || defMemory;

    let genBreakhandle = (key, works, deal) => {
        // get the index, find the break point
        return Promise.resolve(memory.get(key)).then((index = 0) => {
            let startIndex = index;

            let breakHandle = (extra) => {
                let work = works[index];
                let ret = deal(work, index, works, extra);
                // handle the work
                return Promise.resolve(ret).then((res) => {
                    index++;
                    // save the work progress
                    memory.set(key, index);
                    return {
                        res,
                        index,
                        startIndex
                    };
                });
            };

            return {
                startIndex, breakHandle
            };
        });
    };

    let handleBreakList = (actions, opts, toNextMoment = id) => {
        let {
            startIndex = 0, breakHandle
        } = opts;

        if (startIndex >= actions.length) return Promise.resolve({
            resList: [],
            startIndex
        });

        return breakHandle().then(({
            index, res
        }) => {
            if (index < actions.length) {
                let time = toNextMoment(actions[index - 1], index - 1, actions);
                return Promise.resolve(time).then(() => {
                    return handleBreakList(actions, opts, toNextMoment).then(({
                        resList, startIndex
                    }) => {
                        resList.unshift(res);
                        return {
                            resList,
                            startIndex
                        };
                    });
                });
            } else {
                // the last one
                return {
                    startIndex,
                    resList: [res]
                };
            }
        });
    };

    return {
        genBreakhandle,
        handleBreakList
    };
};
