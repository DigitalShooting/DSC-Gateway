# DSC-Gateway
Combine connections to multiple DSCs (sockets) to only one connection, to reduce system load and simplify the client.
We can also pool the sessions data from DSCs to a central database, after each change.

## Installation

### Abhängigkeiten
- nodejs (>4)
- npm

### Git
````
# clone
git clone https://github.com/DigitalShooting/DSC-Gateway.git
cd DSC-Gateway

# NPM rebuild
npm rebuild

# configure
ls config/

# start
node index.js
````

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


#### `startLine`
Trigger wakeonlan for a line.
Can be disabled in `permissions.js` with `startLine`.

##### Example
```javascript
{
	line: "<line id>",
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
	lines: {
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
	},
	teams: {
		<teamID>: {
			gesamt: 0,
			anzahl: 0,
			progress: 0,
			hochrechnung: 0,
			users: {},
		},
	},
}
```



## Caching
We cache `setData` and `setConfig` calls from DSC -> Gateway, to serve it to new clients without `setLine` enabled.


## Teams
DSC-Gateway checks for each `setData` it recevice if `verein` and `manschaft` is set in the user object.
If so, we calculate the sum (and some metadata) for each team, by adding automatically grouping them by the combination of `verein` and `manschaft`.
We use the discipline of a member, regardless if all are the same.


## Licence
GNU GENERAL PUBLIC LICENSE Version 3
