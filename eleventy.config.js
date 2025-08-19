export default function (eleventyConfig) {
  // Tailwind builds to _site/styles/main.css
  return {
    dir: {
      input: "src",
      output: "_site",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
