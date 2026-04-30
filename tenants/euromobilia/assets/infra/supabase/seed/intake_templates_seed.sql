-- Seed: intake_templates for Euromobilia
-- Run after migration 0004

INSERT INTO intake_templates (slug, name, version, definition, is_active)
VALUES (
  'kitchen-quotation',
  'Cotizacion de Cocina',
  1,
  '{
    "slug": "kitchen-quotation",
    "language": "es",
    "first_step": "welcome",
    "complete_step": "complete",
    "steps": [
      {
        "id": "welcome",
        "type": "interactive_list",
        "prompt": "Hola {{contact_name}}, soy tu asistente de cotizaciones Euromobilia. En que te ayudo?",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {"id": "start_intake", "title": "Cotizar Cocina", "description": "Iniciar formulario de cotizacion", "next": "project_type"},
              {"id": "free_text", "title": "Hablar libremente", "description": "Escribe lo que necesites", "next": "_exit_to_agent"},
              {"id": "human", "title": "Hablar con humano", "description": "Escalamiento a agente humano", "next": "_handoff"}
            ]
          }
        ]
      },
      {
        "id": "project_type",
        "type": "interactive_button",
        "field": "project_type",
        "prompt": "Que tipo de proyecto tienes en mente?",
        "options": [
          {"id": "new", "title": "Nueva Cocina", "next": "budget_range"},
          {"id": "renov", "title": "Renovacion", "next": "budget_range"},
          {"id": "appl_only", "title": "Solo Electrodom.", "next": "appliances"}
        ]
      },
      {
        "id": "budget_range",
        "type": "interactive_list",
        "field": "budget_range",
        "prompt": "Cual es tu presupuesto aproximado?",
        "sections": [
          {
            "title": "Rangos",
            "rows": [
              {"id": "under_10k", "title": "Menos de $10,000", "next": "appliances"},
              {"id": "10k_25k", "title": "$10,000 - $25,000", "next": "appliances"},
              {"id": "25k_50k", "title": "$25,000 - $50,000", "next": "appliances"},
              {"id": "over_50k", "title": "Mas de $50,000", "next": "appliances"},
              {"id": "unknown", "title": "No lo se aun", "next": "appliances"}
            ]
          }
        ]
      },
      {
        "id": "appliances",
        "type": "interactive_list",
        "field": "appliances",
        "prompt": "Selecciona un electrodomestico que necesites:",
        "multi_repeat": true,
        "sections": [
          {
            "title": "Linea Premium",
            "rows": [
              {"id": "refrigerator", "title": "Refrigerador", "description": "Sub-Zero integrado o stainless"},
              {"id": "range", "title": "Cocina / Rangetop", "description": "Wolf gas, dual fuel, induccion"},
              {"id": "oven", "title": "Horno", "description": "Simple, doble o vapor"},
              {"id": "dishwasher", "title": "Lavavajillas", "description": "Cove ultra silencioso"},
              {"id": "hood", "title": "Campana", "description": "Wolf o Best extraction"},
              {"id": "wine", "title": "Enfriador de vino", "description": "Sub-Zero wine storage"},
              {"id": "warming", "title": "Cajon calientaplatos", "description": "Wolf warming drawer"},
              {"id": "other", "title": "Otro", "description": "Especificaras despues"}
            ]
          }
        ],
        "next": "ask_another_appliance"
      },
      {
        "id": "ask_another_appliance",
        "type": "interactive_button",
        "prompt": "Quieres agregar otro electrodomestico?",
        "options": [
          {"id": "yes", "title": "Si, agregar otro", "next": "appliances"},
          {"id": "no", "title": "No, continuar", "next": "style"}
        ]
      },
      {
        "id": "style",
        "type": "interactive_list",
        "field": "style",
        "prompt": "Que estilo de cocina prefieres?",
        "sections": [
          {
            "title": "Estilos",
            "rows": [
              {"id": "modern", "title": "Moderno", "next": "timeline"},
              {"id": "classic", "title": "Clasico", "next": "timeline"},
              {"id": "industrial", "title": "Industrial", "next": "timeline"},
              {"id": "minimalist", "title": "Minimalista", "next": "timeline"},
              {"id": "unknown", "title": "No lo se aun", "next": "timeline"}
            ]
          }
        ]
      },
      {
        "id": "timeline",
        "type": "interactive_button",
        "field": "timeline",
        "prompt": "Cual es tu tiempo de entrega deseado?",
        "options": [
          {"id": "urgent", "title": "Urgente (< 1 mes)", "next": "contact_method"},
          {"id": "2_3_months", "title": "2-3 meses", "next": "contact_method"},
          {"id": "flexible", "title": "Flexible", "next": "contact_method"}
        ]
      },
      {
        "id": "contact_method",
        "type": "interactive_button",
        "field": "contact_method",
        "prompt": "Como prefieres que te contactemos?",
        "options": [
          {"id": "whatsapp", "title": "WhatsApp", "next": "summary"},
          {"id": "call", "title": "Llamada telefonica", "next": "summary"},
          {"id": "email", "title": "Correo electronico", "next": "summary"}
        ]
      },
      {
        "id": "summary",
        "type": "interactive_button",
        "prompt": "Resumen de tu solicitud:\n- Proyecto: {{project_type}}\n- Presupuesto: {{budget_range}}\n- Electrodomesticos: {{appliances}}\n- Estilo: {{style}}\n- Entrega: {{timeline}}\n- Contacto: {{contact_method}}\n\nTodo correcto?",
        "options": [
          {"id": "confirm", "title": "Confirmar", "next": "complete"},
          {"id": "edit", "title": "Editar", "next": "welcome"},
          {"id": "cancel", "title": "Cancelar", "next": "_cancel"}
        ]
      },
      {
        "id": "complete",
        "type": "_complete",
        "prompt": "Perfecto! Estamos preparando tu cotizacion personalizada. Un momento por favor..."
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  definition = EXCLUDED.definition,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO intake_templates (slug, name, version, definition, is_active)
VALUES (
  'servicio-tecnico',
  'Servicio Tecnico',
  1,
  '{
    "slug": "servicio-tecnico",
    "language": "es",
    "first_step": "welcome",
    "complete_step": "complete",
    "steps": [
      {
        "id": "welcome",
        "type": "interactive_list",
        "prompt": "Hola {{contact_name}}, necesitas servicio tecnico?",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {"id": "start_intake", "title": "Solicitar servicio", "next": "issue_type"},
              {"id": "free_text", "title": "Hablar libremente", "next": "_exit_to_agent"},
              {"id": "human", "title": "Hablar con humano", "next": "_handoff"}
            ]
          }
        ]
      },
      {
        "id": "issue_type",
        "type": "interactive_list",
        "field": "issue_type",
        "prompt": "Que tipo de problema tienes?",
        "sections": [
          {
            "title": "Problemas",
            "rows": [
              {"id": "not_working", "title": "No enciende", "next": "brand"},
              {"id": "noise", "title": "Ruido extrano", "next": "brand"},
              {"id": "leak", "title": "Fuga / Goteo", "next": "brand"},
              {"id": "temp", "title": "No mantiene temperatura", "next": "brand"},
              {"id": "other", "title": "Otro", "next": "brand"}
            ]
          }
        ]
      },
      {
        "id": "brand",
        "type": "interactive_list",
        "field": "brand",
        "prompt": "Que marca es tu electrodomestico?",
        "sections": [
          {
            "title": "Marcas",
            "rows": [
              {"id": "wolf", "title": "Wolf", "next": "urgency"},
              {"id": "subzero", "title": "Sub-Zero", "next": "urgency"},
              {"id": "cove", "title": "Cove", "next": "urgency"},
              {"id": "other", "title": "Otra marca", "next": "urgency"}
            ]
          }
        ]
      },
      {
        "id": "urgency",
        "type": "interactive_button",
        "field": "urgency",
        "prompt": "Que tan urgente es?",
        "options": [
          {"id": "critical", "title": "Critico (sin uso)", "next": "contact_method"},
          {"id": "high", "title": "Alto (molesto)", "next": "contact_method"},
          {"id": "low", "title": "Bajo (consulta)", "next": "contact_method"}
        ]
      },
      {
        "id": "contact_method",
        "type": "interactive_button",
        "field": "contact_method",
        "prompt": "Como te contactamos?",
        "options": [
          {"id": "whatsapp", "title": "WhatsApp", "next": "summary"},
          {"id": "call", "title": "Llamada", "next": "summary"},
          {"id": "email", "title": "Email", "next": "summary"}
        ]
      },
      {
        "id": "summary",
        "type": "interactive_button",
        "prompt": "Resumen:\n- Problema: {{issue_type}}\n- Marca: {{brand}}\n- Urgencia: {{urgency}}\n- Contacto: {{contact_method}}\n\nCorrecto?",
        "options": [
          {"id": "confirm", "title": "Confirmar", "next": "complete"},
          {"id": "edit", "title": "Editar", "next": "welcome"},
          {"id": "cancel", "title": "Cancelar", "next": "_cancel"}
        ]
      },
      {
        "id": "complete",
        "type": "_complete",
        "prompt": "Gracias! Un tecnico se pondra en contacto contigo pronto."
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  definition = EXCLUDED.definition,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO intake_templates (slug, name, version, definition, is_active)
VALUES (
  'consulta-general',
  'Consulta General',
  1,
  '{
    "slug": "consulta-general",
    "language": "es",
    "first_step": "welcome",
    "complete_step": "complete",
    "steps": [
      {
        "id": "welcome",
        "type": "interactive_list",
        "prompt": "Hola {{contact_name}}, en que te podemos ayudar?",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {"id": "start_intake", "title": "Catalogo / Precios", "next": "topic"},
              {"id": "free_text", "title": "Hablar libremente", "next": "_exit_to_agent"},
              {"id": "human", "title": "Hablar con humano", "next": "_handoff"}
            ]
          }
        ]
      },
      {
        "id": "topic",
        "type": "interactive_list",
        "field": "topic",
        "prompt": "Sobre que tema necesitas informacion?",
        "sections": [
          {
            "title": "Temas",
            "rows": [
              {"id": "catalog", "title": "Ver catalogo", "next": "contact_method"},
              {"id": "prices", "title": "Lista de precios", "next": "contact_method"},
              {"id": "warranty", "title": "Garantia", "next": "contact_method"},
              {"id": "shipping", "title": "Envios / Instalacion", "next": "contact_method"},
              {"id": "other", "title": "Otro", "next": "contact_method"}
            ]
          }
        ]
      },
      {
        "id": "contact_method",
        "type": "interactive_button",
        "field": "contact_method",
        "prompt": "Como te contactamos con la info?",
        "options": [
          {"id": "whatsapp", "title": "WhatsApp", "next": "summary"},
          {"id": "call", "title": "Llamada", "next": "summary"},
          {"id": "email", "title": "Email", "next": "summary"}
        ]
      },
      {
        "id": "summary",
        "type": "interactive_button",
        "prompt": "Resumen:\n- Tema: {{topic}}\n- Contacto: {{contact_method}}\n\nCorrecto?",
        "options": [
          {"id": "confirm", "title": "Confirmar", "next": "complete"},
          {"id": "edit", "title": "Editar", "next": "welcome"},
          {"id": "cancel", "title": "Cancelar", "next": "_cancel"}
        ]
      },
      {
        "id": "complete",
        "type": "_complete",
        "prompt": "Perfecto! Te enviaremos la informacion solicitada pronto."
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  definition = EXCLUDED.definition,
  is_active = EXCLUDED.is_active,
  updated_at = now();
