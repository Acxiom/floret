let FloretSubscriber;

{
    const _name = Symbol('name');
    const _endpoint = Symbol('endpoint');
    const _observer = Symbol('observer');

    FloretSubscriber = class FloretSubscriber {
        constructor(subName, subEndpoint) {
            if (subName && subEndpoint) {
                // the endpoint to post to
                this[_name] = subName;
                this[_endpoint] = subEndpoint;
            } else {
                throw new Error('FloretSubscriber requires name and endpoint arguments');
            }
        }

        get name(){
            return this[_name];
        }

        set name(name){
            this[_name] = name;
        }

        get observer() {
            return this[_observer];
        }

        set observer(ob){
            this[_observer] = ob;
        }

        get endpoint(){
            return this[_endpoint];
        }

        set endpoint(ep){
            this[_endpoint] = ep;
        }
        
        unsubscribe() {
            this[_observer].unsubscribe();

        }
    }
}

module.exports = FloretSubscriber;