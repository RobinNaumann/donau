import {
  authMiddlewareToken,
  bearerAuth,
  donauServerRun,
  err,
  grouped,
  parameterPath,
  route,
  routeAuthed,
  type DonauRoute,
} from "..";

type AuthUser = {
  username: string;
  name: string;
};

const protectedRoutes: DonauRoute<AuthUser>[] = [
  routeAuthed("/name", {
    summary: "Get your name",
    description: `This route is protected and requires authentication. it returns your name.
      Any non-empty string will be accepted as a valid token.`,
    workerAuthed: (user) => {
      return { message: `Hello, ${user.name}!` };
    },
  }),
  routeAuthed("/name", {
    method: "post",
    summary: "Set your name",
    reqBody: {
      description: "Set your name",
      required: ["name"],
      properties: {
        name: "string",
      },
    },
    description:
      "set your name (always returns 'ok'. does not actually set anything)",
    workerAuthed: (user, body) => {
      return { message: `set ${body.name} as your new name` };
    },
  }),
];

const routes: DonauRoute[] = [
  route("/hello/{greeting}", {
    description: `A simple hello world route. It greets you with a message. The endpoint will return an error if you pass "bye" as the greeting.`,
    parameters: [
      parameterPath("greeting", {
        description: "The greeting to address you with",
      }),
    ],
    worker: (greeting) => {
      if (greeting === "bye") {
        return err.badRequest("I don't want to say bye!");
      }
      return { message: `${greeting}, my friend!` };
    },
  }),
];

/**
 * Run a more complex example. this serves the exampleAPI on port 1235 at path `/api`
 */
export function runAuthExample() {
  donauServerRun(1235, {
    info: {
      title: "exampleAPI",
      version: "1.0.3",
      description:
        "This API aims to showcase the abilities of the donau API package",
    },
    securitySchemes: { bearerAuth },
    auth: authMiddlewareToken<AuthUser>(async (token) => ({
      name: "John Doe",
      username: "johndoe",
    })),
    routes: [
      ...routes,
      ...grouped(protectedRoutes, {
        prefix: "/protected",
        tags: ["user management"],
      }),
    ],
  });
}
