require('dotenv').config();

const Typesense = require("typesense");

module.exports = (async () => {
  // Create a client
  const typesense = new Typesense.Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST,
        port: process.env.TYPESENSE_PORT,
        protocol: process.env.TYPESENSE_PROTOCOL
      }
    ],
    apiKey: process.env.TYPESENSE_ADMIN_API_KEY
  });

  const schema = {
    name: "footballers",
    num_documents: 0,
    fields: [
      {
        name: "title",
        type: "string",
        facet: false
      },
      {
        name: "personal_life",
        type: "string",
        facet: false
      },
      {
        name: "url",
        type: "string",
        facet: false
      },
      {
        name: "length",
        type: "float",
        facet: true
      },
      {
        name: "sections",
        type: "string[]",
        facet: true
      },
      // {
      //   name: "sections.lvl0",
      //   type: "string[]",
      //   facet: true,
      //   optional: true
      // },
      // {
      //   name: "sections.lvl1",
      //   type: "string[]",
      //   facet: true,
      //   optional: true
      // },
      // {
      //   name: "sections.lvl2",
      //   type: "string[]",
      //   facet: true,
      //   optional: true
      // },
      // {
      //   name: "sections.lvl3",
      //   type: "string[]",
      //   facet: true,
      //   optional: true
      // },
    ],
    default_sorting_field: "length"
  };

  console.log("Populating index in Typesense");

  const footballers = require("./data/footballers.json");

  let reindexNeeded = false;
  try {
    const collection = await typesense.collections("footballers").retrieve();
    console.log("Found existing schema");
    // console.log(JSON.stringify(collection, null, 2));
    if (
      collection.num_documents !== footballers.length ||
      process.env.FORCE_REINDEX === "true"
    ) {
      console.log("Deleting existing schema");
      reindexNeeded = true;
      await typesense.collections("footballers").delete();
    }
  } catch (e) {
    reindexNeeded = true;
  }

  if (!reindexNeeded) {
    return true;
  }

  console.log("Creating schema: ");
  console.log(JSON.stringify(schema, null, 2));
  await typesense.collections().create(schema);

  // const collectionRetrieved = await typesense
  //   .collections("products")
  //   .retrieve();
  // console.log("Retrieving created schema: ");
  // console.log(JSON.stringify(collectionRetrieved, null, 2));

  console.log("Adding records: ");

  // Bulk Import
  // footballers.forEach(footballer => {
  //   if (footballer.sections.length > 0){
  //     footballer.sections.forEach((section, index) => {
  //       footballer[`sections.lvl${index}`] = [
  //         footballer.sections.slice(0, index + 1).join(" > ")
  //       ];
  //     });
  //   }
  // });

  try {
    const returnData = await typesense
      .collections("footballers")
      .documents()
      .import(footballers);
    console.log(returnData);
    console.log("Done indexing.");

    const failedItems = returnData.filter(item => item.success === false);
    if (failedItems.length > 0) {
      throw new Error(
        `Error indexing items ${JSON.stringify(failedItems, null, 2)}`
      );
    }

    return returnData;
  } catch (error) {
    console.log(error);
  }
})();
