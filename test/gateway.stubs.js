module.exports = (sinon, floret) =>{


// capture all the request

// test the gateway functions

// stub the gateway methods

/*
sinon.stub(floret.gateway,'createChannelAPI').resolves(() =>{
    console.log('createChannelAPI stub called')
});

sinon.stub(floret.gateway,'createSubscriptionAPI').resolves(() =>{
    console.log('createSubscriptionAPI stub called')
});

sinon.stub(floret.gateway,'deleteChannelAPI').resolves(() =>{
    console.log('deleteChannelAPI stub called')
});

sinon.stub(floret.gateway,'deleteAllAPIs').resolves(() =>{
    console.log('deleteAllAPIs stub called')
});

sinon.stub(floret.gateway,'register').resolves(() =>{
    console.log('register stub called')
});

sinon.stub(floret.gateway,'discover').resolves(() =>{
    console.log('discover stub called')
});

sinon.stub(floret.gateway,'discoverChannels').callsFake(() =>{
    console.log('discoverChannels stub called')
    return [];
});

sinon.stub(floret.gateway,'discoverAllChannels').resolves(() =>{
    console.log('discoverAllChannels stub called')
});

sinon.stub(floret.gateway,'discoverServices').resolves(() =>{
    console.log('discoverServices stub called')
});

sinon.stub(floret.gateway,'discoverServiceChannels').resolves(() =>{
    console.log('discoverServiceChannels stub called')
});

sinon.stub(floret.gateway,'discoverSubscribers').callsFake(() =>{
    console.log('discoverSubscribers stub called');
    return [];
});

sinon.stub(floret.gateway,'register').resolves(() =>{
        console.log('register stub called')
    });
    sinon.stub(floret.gateway,'discover').resolves(() =>{
        console.log('discover stub called')
    });
    sinon.stub(floret.gateway,'discoverAllChannels').resolves(() =>{
        console.log('discoverAllChannels stub called')
    });
*/

    sinon.stub(floret.gateway,'discoverChannels').callsFake(() =>{
        console.log('discoverChannels stub called')
        return [];
    });

sinon.stub(floret.gateway,'getAPIs').resolves({"data": [
        {
            "name": "api1"
        },
        {
            "name": "api2"
        }]}
);

sinon.stub(floret.gateway,'getAPI').callsFake((name) =>{
    console.log('getAPI stub called ' + name)

    if (!name) {

        throw new Error('bad api request');
    }
    return {
        "name": name
    }
});
    sinon.stub(floret.gateway,'discoverAPISpecs').callsFake(() =>{
        console.log('apispecs stub')
        return [{"name": "apiSpec1"}];
    });

/*
sinon.stub(floret.gateway,'apiRequestByName').resolves(() =>{
    console.log('apiRequestByName stub called')
});

sinon.stub(floret.gateway,'apiRequestByURI').resolves(() =>{
    console.log('apiRequestByURI stub called')
});

sinon.stub(floret.gateway,'getAPIsWithUpstreamURL').resolves(() =>{
    console.log('getAPIsWithUpstreamURL stub called')
});

sinon.stub(floret.gateway,'addAPI').resolves(() =>{
    console.log('addAPI stub called')

});

sinon.stub(floret.gateway,'deleteAPI').resolves(() =>{
    console.log('deleteAPI stub called')
});

sinon.stub(floret.gateway,'subscribeTo').resolves( () => {
    console.log('subscribeTo stub called');
});

sinon.stub(floret.gateway,'unsubscribe').resolves(() =>{
    console.log('unsubscribe stub called')
});
sinon.stub(floret.gateway,'loadSubscribers').resolves(() =>{
    console.log('loadSubscribers stub called')
});

sinon.stub(floret.gateway,'discoverAPISpecs').callsFake(() =>{
    console.log('apispecs stub')
    return [{"name": "apiSpec1"}];
});
sinon.stub(floret.gateway,'').callsFake(() =>{
    console.log(' stub called')
});
sinon.stub(floret.gateway,'').callsFake(() =>{
    console.log(' stub called')
});
sinon.stub(floret.gateway,'').callsFake(() =>{
    console.log(' stub called')
});
sinon.stub(floret.gateway,'').callsFake(() =>{
    console.log(' stub called')
});
sinon.stub(floret.gateway,'').callsFake(() =>{
    console.log(' stub called')
});
*/

};