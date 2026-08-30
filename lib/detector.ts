export interface StackInfo {
  language: string
  installCmd: string
  startCmd: string
  port: number
}

export function detectStack(fileList: string[]): StackInfo {
  const hasFile = (name: string) => fileList.some(f => f.endsWith(name) || f.includes(`/${name}`))
  const hasFileContaining = (name: string) => fileList.some(f => f.includes(name))

  if (hasFile('package.json')) {
    // We'll read deps via exec, so just detect by common framework indicators in the file list
    // The caller should pass dependency names derived from package.json if known.
    // For now: look for lock files or framework-specific files as hints.
    if (hasFileContaining('next.config') || hasFileContaining('app/layout') || hasFileContaining('pages/index')) {
      return {
        language: 'node',
        installCmd: 'cd workspace/repo && npm install',
        startCmd: 'cd workspace/repo && npm run dev -- --hostname 0.0.0.0',
        port: 3000,
      }
    }
    if (hasFile('vite.config.ts') || hasFile('vite.config.js')) {
      return {
        language: 'node',
        installCmd: 'cd workspace/repo && npm install',
        startCmd: 'cd workspace/repo && npm run dev -- --host 0.0.0.0 --port 5173 --strictPort',
        port: 5173,
      }
    }
    return {
      language: 'node',
      installCmd: 'cd workspace/repo && npm install',
      startCmd: 'cd workspace/repo && npm start',
      port: 3000,
    }
  }

  if (hasFile('requirements.txt')) {
    if (hasFileContaining('streamlit')) {
      return {
        language: 'python',
        installCmd: 'cd workspace/repo && pip install -r requirements.txt',
        startCmd: 'cd workspace/repo && streamlit run app.py --server.address 0.0.0.0',
        port: 8501,
      }
    }
    if (hasFileContaining('fastapi') || hasFileContaining('uvicorn')) {
      return {
        language: 'python',
        installCmd: 'cd workspace/repo && pip install -r requirements.txt',
        startCmd: 'cd workspace/repo && uvicorn main:app --host 0.0.0.0',
        port: 8000,
      }
    }
    return {
      language: 'python',
      installCmd: 'cd workspace/repo && pip install -r requirements.txt',
      startCmd: 'cd workspace/repo && python app.py',
      port: 5000,
    }
  }

  throw new Error(
    `Could not detect stack. Found files: ${fileList.slice(0, 10).join(', ')}. ` +
    `Supported stacks: Next.js, Vite, Node (package.json), Streamlit, FastAPI, Flask (requirements.txt).`
  )
}
