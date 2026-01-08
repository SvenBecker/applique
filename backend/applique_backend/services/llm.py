# ruff: noqa: PLC0415
# Lazy imports are intentional for this module to reduce startup time
from pydantic_ai import ModelSettings
from pydantic_ai.models import Model


def get_model(  # noqa: PLR0911  # Multiple providers require multiple returns
    provider: str,
    model_name: str,
    base_url: str | None,
    api_key: str | None,
    model_settings: ModelSettings | None = None,
) -> Model:
    match provider:
        case "openai" | "lmstudio":
            from pydantic_ai.models.openai import OpenAIChatModel
            from pydantic_ai.providers.openai import OpenAIProvider

            return OpenAIChatModel(
                model_name,
                provider=OpenAIProvider(base_url=base_url, api_key=api_key),
                settings=model_settings,
            )

        case "ollama":
            from pydantic_ai.models.openai import OpenAIChatModel
            from pydantic_ai.providers.ollama import OllamaProvider

            return OpenAIChatModel(
                model_name,
                provider=OllamaProvider(base_url=base_url, api_key=api_key),
                settings=model_settings,
            )

        case "groq":
            from pydantic_ai.models.groq import GroqModel
            from pydantic_ai.providers.groq import GroqProvider

            return GroqModel(
                model_name,
                provider=GroqProvider(base_url=base_url, api_key=api_key),
                settings=model_settings,
            )

        case "anthropic":
            from pydantic_ai.models.anthropic import AnthropicModel
            from pydantic_ai.providers.anthropic import AnthropicProvider

            return AnthropicModel(
                model_name,
                provider=AnthropicProvider(base_url=base_url, api_key=api_key),
                settings=model_settings,
            )

        case "google":
            from pydantic_ai.models.google import GoogleModel
            from pydantic_ai.providers.google import GoogleProvider

            return GoogleModel(
                model_name,
                provider=GoogleProvider(api_key=api_key, base_url=base_url),
                settings=model_settings,
            )

        case "mistral":
            from pydantic_ai.models.mistral import MistralModel
            from pydantic_ai.providers.mistral import MistralProvider

            mistral_provider: MistralProvider = MistralProvider(api_key=api_key, base_url=base_url)  # type: ignore[call-arg]
            return MistralModel(
                model_name,
                provider=mistral_provider,
                settings=model_settings,
            )

        case "openrouter":
            from pydantic_ai.models.openrouter import OpenRouterModel
            from pydantic_ai.providers.openrouter import OpenRouterProvider

            return OpenRouterModel(
                model_name,
                provider=OpenRouterProvider(api_key=api_key),
                settings=model_settings,
            )

        case "cohere":
            from pydantic_ai.models.cohere import CohereModel
            from pydantic_ai.providers.cohere import CohereProvider

            return CohereModel(
                model_name,
                provider=CohereProvider(api_key=api_key),
                settings=model_settings,
            )

        case _:
            raise ValueError(f"Invalid {provider=}")
