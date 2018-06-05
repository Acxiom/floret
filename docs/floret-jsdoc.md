# Global





* * *

## Class: Floret



## Class: Floret


### Floret.listen(portOverride) 

**Parameters**

**portOverride**: 


### Floret.init() 

**Returns**: `boolean`

### Floret.getAPI(name) 

**Parameters**

**name**: 

**Returns**: `*`

### Floret.registerAPI(name, uri, methods) 

**Parameters**

**name**: 

**uri**: 

**methods**: 


### Floret.deleteAPI(name) 

**Parameters**

**name**: 

**Returns**: `*`

### Floret.apiRequest(uri, method, payload, gateway) 

**Parameters**

**uri**: 

**method**: 

**payload**: 

**gateway**: 

**Returns**: `* | any | XMLHttpRequest`

### Floret.initChannels() 


### Floret.initChannel(channel) 

**Parameters**

**channel**: 



## Class: Channel



## Class: Channel


**channels**:  
**channels**:  
### Channel.discoverChannels() 

**Returns**: `* | Observable.&lt;R&gt; | any`

### Channel.createChannelAPI(channel) 

**Parameters**

**channel**: 


### Channel.updateChannel(channel) 

**Parameters**

**channel**: 


### Channel.deleteChannel(channel) 

**Parameters**

**channel**: 



## Class: Subscriber



## Class: Subscriber


**subscriptions**:  
**subscriptions**:  
**name**:  
**host**:  
**port**:  
**url**:  
**service**:  
**sub**:  
**pub**:  
**router**:  
**gateway**:  
### Subscriber.discoverSubscribers() 

**Returns**: `*`

### Subscriber.createSubscriberAPI() 


### Subscriber.subscribersByChannel(channelName) 

**Parameters**

**channelName**: 

**Returns**: `Array | Array.&lt;T&gt; | * | Observable | any`

### Subscriber.removeChannelSubscribers(channelName) 

**Parameters**

**channelName**: 


### Subscriber.initSubscriptions() 


### Subscriber.discoverSubscriptions() 




* * *










