<img src="assets/donau_API_logo.png" width="220px" /><br><br>

# **donau** &nbsp;&nbsp;&nbsp;&nbsp; REST API framework

a lightweight framework for defining and running REST APIs. It is based on express and automatically generates and serves an open api documentation.

_<img src="assets/screenshot.png" width="300px">_

## features

- usable as standalone server or with existing `express`
- automatic Open API documentation generation/serving
- out-of-the-box **auth** handling
  - JWT authentication
  - Basic authentication
- simple and sleek developer experience
- type safe
- easy to use and extend
- integrated logging via `logger`

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
        ? err.badRequest("don't say bye")
        : { message: `${greeting}, my friend!` };
    },
  }),
];
```

and then configuring the server:

```typescript
donauServerRun(1235 /* the port */, {
  info: {
    title: "basicAPI",
    version: "1.0.3",
    description: "an example API",
  },
  //cors: {origin: "*"},
  routes: routes,
});
```

that's it! the API is now running on `localhost:1235/api`.
You can access the open api documentation at `localhost:1235/docs`.

If you want to disable the documentation, you can set `docsPath: null`.

### authentication

you can of course provide your own authentication middleware to the server. but for convenience, the framework provides a prebuilt way to handle authentication. you can define a `new JWTAuth` object and pass it to the `donauServerRun` function:

```typescript

const jwtAuth = new JWTAuth({
  secretKey: "mySecretKey",
  // remove onSignUp if you don't want to allow sign up
  onSignUp: async (req, res) => {...},
  // this provides a rich user object to your routes
  getUser: async (username) => {...},
  // load the password hash from your database
  getPasswordHash: async (username) => {...},
})


donauServerRun(1235, {
  info: {
    title: "basicAPI",
    version: "1.0.3",
    description: "an example API",
  },
  routes: yourRoutes,
  // this adds the auth middleware and routes to your API
  auth: jwtAuth,
});
```

you can then use the `handlerAuthed` function to define protected routes

## server calls

donau also provides a simple client side API. this makes it possible to define functions both in the server and the client. This allows you to implement simple web applications without explicitly defining a REST API. The function calls are also type safe

1. in a shared file, define your server call functions signatures

```typescript
import { serverCall } from "donau/servercalls/shared";

export const serverCalls = {
  timesTwo: serverCall<{ n: number }, number>(),
  // pass {auth: true} to enable authentication
};
```

2. in the client project, define the use-interface

```typescript
import { useServerCalls } from "donau/servercalls/client";

const onServer = useServerCalls(serverCalls);
```

3. in the server project, add the function definitions

```typescript
import { handleServerCalls } from "donau/servercalls/server";

const scRoutes = handleServerCalls(serverCalls, {
  timesTwo: async ({ n }) => n * 2,
});

// then add those routes to your donau routes
```

now you're good to go. You can use the functions from the client by calling

```typescript
const result = await onServer.timesTwo({ n: 2 });
```

## contribution

you are most welcome to suggest improvements or contribute code via the [github repository](https://github.com/RobinNaumann/donau)

_I hope this package is useful to you,_<br>
_Yours, Robin_

[!["donate"](https://robbb.in/donate/widgets/btn_long_git.png)](https://robbb.in/donate)

```

```
