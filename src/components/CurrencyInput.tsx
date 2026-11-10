"use client";

/** Campo de valor em R$ que formata sozinho enquanto a pessoa digita —
 * cada dígito entra pela direita, como em caixa eletrônico/maquininha:
 * "150000" vira "1.500,00". Evita erro de digitar vírgula/ponto errado. */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled,
}: {
  /** Valor em reais (não em centavos). null/0 mostra o campo vazio. */
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const display =
    value != null && value !== 0
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = digits ? parseInt(digits, 10) : 0;
    onChange(cents / 100);
  }

  return (
    <input
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
