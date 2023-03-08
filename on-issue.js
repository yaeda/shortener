const fs = require("fs").promises;

module.exports = async () => {
  try {
    const files = await fs.readdir(path);
    for (const file of files) console.log(file);
  } catch (err) {
    console.error(err);
  }
};
