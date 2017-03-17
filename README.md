# DSC-Gateway
Combine connections to multiple DSCs (sockets) to only one connection, to reduce system load and simplify the client.
We can also pool the sessions data from DSCs to a central database, after each change.

## API

### Client -> Gateway
#### `getLines`
Triggers sending `onlineLines`.


#### `setLine`
`setLine` run given method on DSC client with given line id.
Can be disabled in `permissions.js` with `setLine`.

##### Example
```javascript
{
	method: "<method name>",
	line: "<line id>",
	data: {
		param: "<data object for DSC call>",
		param2: "",
	},
}
```


#### `setPower`
Power on/ off a line.
Can be disabled in `permissions.js` with `setPower`.

##### Example
```javascript
{
	line: "<line id>",
	state: true,
}
```



### Gateway -> Client
#### `*` (DSC -> Gateway)
We redirect all calls from each DSC line to the gateway to the client, by using the original method name.
The data is moved to `.data`, and we add the sender line id to the root object.

##### Example
```javascript
{
	line: "<sender line id>",
	data: {
		param: "<data object from DSC call>",
		param2: "",
	}
}
```


#### `onlineLines`
Sends a list of all DSCs to the client.

##### Example
```javascript
{
	<lineID>: {
		id: "<line id>",
		label: "<line label>",
		ip: "<line ip>",
		port: "<line port>",
		labelShort: "<labelShort (e.g. line number)>",
		online: true,
		cache = {
			setData: { ... },
			setConfig: { ... },
		},
	},
	...
}
```



## Caching
We cache `setData` and `setConfig` calls from DSC -> Gateway, to serve it to new clients without `setLine` enabled.
Therefor we call the getter methods `getData` and `getConfig` after a new line has connected.
