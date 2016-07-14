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

/**
 * fragment index:
 *
 * start -> start + 1 -> ...... -> start + fragment.length
 */
let getFragmentIndex = (breakIndex, start) => {
    return breakIndex - start;
};

module.exports = (memory, key, works, start = 0, end) => {
    memory = memory || defMemory;
    let getState = () => {
        return memory.get(key).then((ret) => {
            return ret || {
                index: 0
            };
        });
    };

    let getIndex = () => {
        return getState().then(ret => ret.index);
    };

    let setState = (index) => {
        // save the work progress
        return memory.set(key, {
            index,
            lastworkTime: new Date().getTime()
        });
    };

    let genBreakhandle = (deal) => {
        // get the index, find the break point
        return getState().then(({
            index
        }) => {
            let breakIndex = index;

            let breakHandle = () => {
                let work = works[index];
                let ret = deal(work, index, works);
                // handle the work
                return Promise.resolve(ret).then((res) => {
                    index++;
                    // save the work progress
                    setState(index);
                    return {
                        res,
                        index,
                        breakIndex // record break point
                    };
                });
            };

            return {
                breakIndex, breakHandle
            };
        });
    };

    let handleBreakList = (deal, toNextMoment = id) => {
        end = end || works.length - 1; //last one

        return genBreakhandle(deal).then(({
            breakIndex, breakHandle
        }) => {
            let fragment = works.slice(start, end + 1);

            let frgIndex = getFragmentIndex(breakIndex, start);

            if (frgIndex >= fragment.length) return Promise.resolve({
                resList: [],
                breakIndex
            });

            return breakHandle().then(({
                index, res
            }) => {
                let frgIndex = getFragmentIndex(index, start);
                if (frgIndex < fragment.length) {
                    // get last work's finished lastworkTime
                    return getState().then(({
                        lastworkTime
                    }) => {
                        let wait = toNextMoment(fragment[frgIndex], index, works, lastworkTime);
                        return Promise.resolve(wait).then(() => {
                            return handleBreakList(deal, toNextMoment).then(({
                                resList, breakIndex
                            }) => {
                                resList.unshift(res);
                                return {
                                    resList,
                                    breakIndex
                                };
                            });
                        });
                    });
                } else {
                    // the last one
                    return {
                        breakIndex,
                        resList: [res]
                    };
                }
            });
        });
    };

    return {
        genBreakhandle,
        handleBreakList,
        getState,
        getIndex
    };
};
