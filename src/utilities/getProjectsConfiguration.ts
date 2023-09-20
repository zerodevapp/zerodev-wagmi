import { ProjectConfiguration } from "../types/index.js"

const projectConfigurationCache: { [key: string]: Promise<ProjectConfiguration> } = {}

export const BACKEND_URL = process.env.REACT_APP_ZERODEV_BACKEND_URL ?? 'https://backend-vikp.onrender.com'

export const getProjectsConfiguration = async (
  projectIds: string[],
  backendUrl?: string
): Promise<ProjectConfiguration> => {
  // If the result is already cached, return it
  const projectIdsKey = projectIds.join('-')
  if (projectConfigurationCache[projectIdsKey] === undefined) {
    projectConfigurationCache[projectIdsKey] = new Promise<ProjectConfiguration>((resolve, reject) => {
      fetch(
        `${backendUrl ?? BACKEND_URL}/v1/projects/get`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectIds: projectIds.map(projectId => projectId.toString())
          })
        }
      ).then(resp => {
        resp.json().then(resolve).catch(reject)
      }).catch(reject)
    })
  }
  return await projectConfigurationCache[projectIdsKey]
}