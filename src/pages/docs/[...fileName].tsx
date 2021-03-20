import renderToString from "next-mdx-remote/render-to-string";
import hydrate from "next-mdx-remote/hydrate";
import path from "path";
//import { listMdxPaths, listMdxFilesRecursive } from "@vulcanjs/mdx";
import { promises as fsPromises } from "fs";
import { Link, Typography } from "@material-ui/core";

import matter from "gray-matter";
import { muiMdComponents } from "~/components/layout/muiMdComponents";

// Define components to allow them in your mdx files
// import Test from '../components/test'
//
// You can also replace HTML tags (components is passed to MDXProvider )
// @see https://mdxjs.com/table-of-components
type MdxPath = {
  params: {
    fileName: Array<String>
  }
}

const components = {
  //Test,
  ...muiMdComponents,
};

const indexLink = (
  <div style={{ margin: "32px auto", maxWidth: "1000px" }}>
    <Link href="/docs">
      <Typography>Back to documentation index</Typography>
    </Link>
  </div>
);

export default function DocPage({ source, frontMatter /*, filePath*/ }) {
  const content = hydrate(source, {
    components,
  });
  return (
    <div className="MDXProvider root">
      {indexLink}
      {content}
      {indexLink}
      <style jsx>{`
        .MDXProvider.root {
          margin: 32px auto;
          max-width: 1000px;
        }
      `}</style>
    </div>
  );
}

export async function getStaticPaths() {
  const docsDir = path.resolve("./src/content/docs"); // relative to the project root
  //const files = await listMdxPaths({ dir: docsDir });
  
  let paths: MdxPath[] = [];

  for await (const f of getFiles(docsDir)) {
    //process paths
    const fParsed = path.parse(f);
    if(fParsed.ext.match(/.mdx?$/)) {
      const relativePath = f.replace(docsDir, "");
      let pathArgs: Array<String> = relativePath.split(path.sep);
      pathArgs.shift();
      if(fParsed.name === "index") {
        pathArgs.pop();
      } else {
        pathArgs[pathArgs.length - 1] = fParsed.name; 
      }
      paths.push({params: {fileName: pathArgs}})
    }
  }
  
  return {
    paths,
    fallback: false, // See the "fallback" section below
  };
}

async function* getFiles(dir) {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      //do something to get the path link
      yield res
    }
  }
}


export async function getStaticProps({ params }) {
  const fileNames = params.fileName;
  const docFolder = "./src/content/docs";
  const fullPath = path.resolve(docFolder, ...fileNames)

  let isFolder;
  try {
    await fsPromises.access(fullPath);
    isFolder = true;
  } catch {
    isFolder = false;
  }
  
  const filePath = (isFolder)?path.resolve(fullPath, "index.md"): fullPath + ".md";
  const source = await fsPromises.readFile(filePath, { encoding: "utf8" });
  // MDX text - can be from a local file, database, anywhere
  const { content, data } = matter(source);
  // Does a server-render of the source and relevant React wrappers + allow to inject React components
  const mdxSource = await renderToString(content, { components });
  return { props: { source: mdxSource, frontMatter: data, filePath } };
}