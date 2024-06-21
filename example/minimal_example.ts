import { donauServerRun, err, parameterPath, route, type DonauRoute } from "..";

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
 * Run the minimal example. this serves the exampleAPI on port 1235 at path `/api`
 */
export function runMinimalExample() {
  donauServerRun(1235, {
    info: {
      title: "exampleAPI minimal",
      version: "1.0.3",
      description:
        "This API aims to showcase the basic abilities of the donau API package",
    },
    routes: routes,
  });
}
