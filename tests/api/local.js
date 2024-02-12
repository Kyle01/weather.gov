import fs from "fs/promises";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import proxy from "./proxy.js";

dayjs.extend(utc);

const dataPath = "./data";

const exists = async (file) => {
  try {
    await fs.access(file, fs.constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const processDates = (obj) => {
  const now = dayjs();

  // Recursively search through the object to find all values that have the
  // date:now token so we can process those into proper ISO8601 timestamps.
  Object.entries(obj ?? {}).forEach(([key, value]) => {
    // For arrays and objects, recurse into them
    if (Array.isArray(value)) {
      value.forEach(processDates);
    } else if (typeof value === "object") {
      processDates(value);
    }
    // But if the value has a startsWith function and it starts with the token,
    // we've got a thing that needs parsing.
    else if (value.startsWith?.("date:now")) {
      // Splitting on date:now results in ['', <modifiers>]. Trim it and split
      // on spaces to get the offset and unit.
      const [amount, unit] = value.split("date:now")[1].trim().split(" ");
      // Modify (or not) the date and format it. We can't use Day.js's
      // toISOString() function because it includes milliseconds, which is fine,
      // but PHP fails to parse ISO 8601 strings with milliseconds. :sigh:
      // Thankfully the regular .format() function returns an ISO 8601 string
      // but without milliseconds.
      if (amount && unit) {
        obj[key] = now.add(Number.parseInt(amount, 10), unit).format();
      } else {
        obj[key] = now.format();
      }
    }
  });
};

export default async (request, response) => {
  // Put the query string back together.
  const query = Object.entries(request.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // The file path is the request path plus the query string, if any.
  const filePath = `${path.join(dataPath, request.path)}${
    query.length > 0 ? "__" : ""
  }${query}.json`;

  const fileExists = await exists(filePath);

  if (!fileExists) {
    console.log(`LOCAL:    local file does not exist; proxying`);
    await proxy(request, response);
  } else {
    console.log(`LOCAL:    serving local file: ${filePath}`);
    const output = JSON.parse(await fs.readFile(filePath));
    processDates(output);

    response.writeHead(200, {
      server: "weather.gov dev proxy",
      "Content-Type": "application/geo+json",
      "access-control-allow-origin": "*",
      "access-control-expose-headers":
        "X-Correlation-Id, X-Request-Id, X-Server-Id",
    });
    response.write(JSON.stringify(output, null, 2));
    response.end();
  }
};
