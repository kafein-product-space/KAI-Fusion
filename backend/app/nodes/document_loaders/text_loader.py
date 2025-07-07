from ..base import ProviderNode, NodeInput, NodeOutput, NodeType

class TextDataLoaderNode(ProviderNode):
    def __init__(self):" "
        super().__init__()
        self._metadata = {
            "name": "TextDataLoader",
            "display_name": "Text Data Loader",
            "description": "Loads plain text data as a document.",
            "category": "Document Loaders",
            "node_type": NodeType.PROVIDER,
            "inputs": [
                NodeInput(
                    name="text",
                    type="str",
                    description="The text to load",
                    required=True
                )
            ],
            "outputs": [
                NodeOutput(
                    name="document",
                    type="document",
                    description="Loaded document"
                )
            ]
        }

    def execute(self, text: str, **kwargs):
        # Basitçe text'i bir dict olarak döndürüyoruz (örnek)
        return {"document": {"content": text}} 