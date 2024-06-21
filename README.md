<img src="https://raw.githubusercontent.com/RobinNaumann/donau/main/assets/donau_API_logo.png" width="220px" /><br><br>

# **donau** _(REST API framework)_

a lightweight framework for defining and running REST APIs. It is based on express and automatically generates and serves an open api documentation.

## features

- usable as standalone server or with existing `express`
- automatic Open API documentation generation/serving
- authentication handling
- simple and sleek developer experience (simmilar to Open API)

## usage

check out the example project at `/example`

- `minimal_example` provides a rudimentary API serving just one endpoint
- `auth_example` provides a more complex API that defines nested endpoints and handles user authentication

### simple example

an api can be defined and served just by:

defining the routes:

```typescript
const routes: DonauRoute[] = [
  route("/hello/{greeting}", {
    description: `A simple hello world route`,
    parameters: [
      parameterPath("greeting", {
        description: "the greeting phrase",
      }),
    ],
    worker: (greeting) => {
      return greeting === "bye"
        ? err.badRequest("don't say bye");
        : {message: `${greeting}, my friend!`};
    },
  }),
];
```

and then configuring the API

```typescript
donauServerRun(1235 /* the port */, {
  info: {
    title: "basicAPI",
    version: "1.0.3",
    description: "an example API",
  },
  routes: routes,
});
```

## contribution

you are most welcome to suggest improvements or contribute code via the [github repository](https://github.com/RobinNaumann/donau)

_I hope this package is useful to you,_<br>
_Yours, Robin_
