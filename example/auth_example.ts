import {
  BasicAuth,
  donauServerRun,
  err,
  grouped,
  parameter,
  ParameterTypes,
  route,
  routeAuthed,
  type DonauRoute,
} from "..";

type AuthUser = {
  username: string;
  name: string;
  passwordHash: string;
};
const users: AuthUser[] = [];

const protectedRoutes: DonauRoute<AuthUser, any>[] = [
  routeAuthed("/name", {
    summary: "Get your name",
    description: `This route is protected and requires authentication. it returns your name.
      Any non-empty string will be accepted as a valid token.`,
    workerAuthed: (user, {}) => {
      return { message: `Hello, ${user.name}!` };
    },
  }),
  routeAuthed("/name", {
    method: "post",
    summary: "Set your name",
    parameters: {
      example: parameter.query({
        type: ParameterTypes.string,
        description: "An example query parameter",
      }),
      body: parameter.body({
        type: "any" as any,
        description: "Set your name",
        properties: {
          name: { type: "string", required: true },
        },
      }),
    } as const,
    description: "set your name to a new value",
    workerAuthed: (user, { body }) => {
      const uIndex = users.findIndex((u) => u.username === user.username);
      if (uIndex === -1) return err.notFound("user not found");
      users[uIndex].name = body.name;
      return { message: `set ${body.name} as your new name` };
    },
  }),
];

const routes: DonauRoute<any, any>[] = [
  route("/hello/{greeting}", {
    description: `A simple hello world route. It greets you with a message. The endpoint will return an error if you pass "bye" as the greeting.`,
    parameters: {
      greeting: parameter.path({
        type: ParameterTypes.string,
        description: "The greeting to address you with",
      }),
    },
    worker: ({ greeting }) => {
      if (greeting === "bye") {
        return err.badRequest("I don't want to say bye!");
      }
      return { message: `${greeting}, my friend!` };
    },
  }),
];

const auth = new BasicAuth<AuthUser>({
  //secretKey: "supersecretkey",
  onSignUp: async (username, passwordHash) => {
    users.push({ username, name: "Unnamed User", passwordHash });
  },
  getUser: async (username) => {
    return users.find((u) => u.username === username);
  },
  getPasswordHash: async (username) => {
    return users.find((u) => u.username === username)?.passwordHash;
  },
});

export function runAuthExample() {
  donauServerRun(1235, {
    info: {
      title: "exampleAPI",
      version: "1.0.3",
      description:
        "This API aims to showcase the abilities of the donau API package",
    },
    auth: auth,
    routes: [
      ...routes,
      ...grouped(protectedRoutes, {
        prefix: "/protected",
        tags: ["user management"],
      }),
    ],
  });
}
