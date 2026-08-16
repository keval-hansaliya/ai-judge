export class BaseProvider {
  async generateResponse(modelId, prompt) {
    throw new Error("generateResponse method not implemented");
  }
}
