export class ZeroDevApiService{
    static baseUrl = process.env.REACT_APP_ZERODEV_BACKEND_URL ?? 'https://backend-vikp.onrender.com'
    static async getProjectConfiguration(projectId: string){
        const resp = await fetch(
            `${ZeroDevApiService.baseUrl}/v1/projects/${projectId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        )
        return await resp.json()
    }
}