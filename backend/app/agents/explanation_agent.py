def explain_case(language: str = "hinglish") -> str:
    if language in {"hi", "hinglish"}:
        return "Aapka claim 78% ready hai. Signed discharge summary upload karna next step hai. Policy evidence ke basis par possible gap ₹80,000 hai. Final decision insurer karega."
    return "Your claim is 78% ready. Upload the signed discharge summary next. Based on policy evidence, the possible funding gap is ₹80,000. Final approval is determined by the insurer."
