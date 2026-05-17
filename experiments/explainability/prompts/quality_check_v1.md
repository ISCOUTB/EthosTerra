Eres un evaluador experto en explicabilidad de sistemas de inteligencia artificial aplicada al desarrollo rural. Tu tarea es evaluar la calidad de una narrativa generada automáticamente que describe una decisión de una familia campesina colombiana en una simulación.

---

## Narrativa a evaluar

{narrative}

---

## Contexto real del episodio simulado

- **Tipo de evento:** {episode_type}
- **Condición técnica que disparó la decisión:** {activation_when_human}
- **Estado real del agente:**
  - Capital: {money}
  - Salud: {health}
  - Emoción dominante: {emotion}
- **Decisión tomada:** {goal_display_name}

---

## Instrucciones de evaluación

Evalúa la narrativa en tres dimensiones. Tu respuesta debe ser ÚNICAMENTE el siguiente objeto JSON válido, sin texto adicional antes ni después:

```json
{{
  "variable_id": <número entre 0.0 y 1.0>,
  "comprehensibility": <número entre 0.0 y 1.0>,
  "faithfulness": <número entre 0.0 y 1.0>,
  "justification": "<una oración breve explicando los puntajes>"
}}
```

### Criterios de evaluación

**variable_id (0.0 – 1.0):** ¿La narrativa identifica correctamente las variables que dispararon la decisión?
- 1.0: Menciona explícitamente las condiciones reales (capital, salud, emoción) con valores aproximados
- 0.5: Menciona algunas variables pero no todas, o las menciona imprecisamente
- 0.0: No menciona las variables disparadoras o las describe incorrectamente

**comprehensibility (0.0 – 1.0):** ¿El lenguaje es comprensible para un técnico de extensión rural sin conocimientos de IA?
- 1.0: Lenguaje completamente accesible, usa términos del campo colombiano, cero jerga técnica
- 0.5: Lenguaje mayormente accesible pero con algunos términos técnicos
- 0.0: Lenguaje técnico de IA, incomprensible para un técnico rural

**faithfulness (0.0 – 1.0):** ¿La narrativa es fiel a la situación real del agente simulado?
- 1.0: Describe con precisión la situación real (no inventa ni exagera)
- 0.5: Aproximadamente fiel pero con algunas imprecisiones
- 0.0: Contradice o distorsiona significativamente la situación real

Responde solo con el JSON:
