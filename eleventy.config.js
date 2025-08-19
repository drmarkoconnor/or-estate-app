export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });
  return {
    dir: {
      input: "src",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
