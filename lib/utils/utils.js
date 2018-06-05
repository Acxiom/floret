function utils() {
    function arrayToObject(arr) {
        if (!arr.reduce) {
            console.log('tried to reduce ' + JSON.stringify(arr))
        }
        let newObj = arr.reduce( (acc, val) => {
            acc[val] = 0;
            return acc;
        }, {});
        return newObj;
    }

    function areEqualObj(obj1, obj2) {

        for (let key in obj1) {
            if (!obj2[key]) {
                return false;
            }
        }
        for (let key in obj2) {
            if (!obj1[key]) {
                return false;
            }
        }
        return true;
    }

    function areEqualArr(arr1, arr2) {
        return this.areEqualObj(this.arrayToObject(arr1), this.arrayToObject(arr2))
    }
    return {
        areEqualArr: areEqualArr,
        areEqualObj: areEqualObj,
        arrayToObject: arrayToObject
    }
};

module.exports = utils();