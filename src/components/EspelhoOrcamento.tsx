import React from 'react';
import {
  User,
  FileText,
  Package,
  Truck,
  Tag,
  Calculator,
  DollarSign,
} from 'lucide-react';
import { FenixOfficialLogo } from './FenixOfficialLogo';

export interface EspelhoItem {
  id: string;
  qtd: string;
  qtdDetalhe?: string;
  descricao: string;
  subtitulo?: string;
  unidade: string;
  precoUnitario: number;
  total: number;
}

export interface EspelhoOrcamentoProps {
  id?: string;
  clientName: string;
  clientType: string;
  clientContact: string;
  consultoraName: string;
  dataOrcamento: string;
  observacoes: string;
  observacoesRodape?: string;
  items: EspelhoItem[];
  freteValor: number;
  freteEndereco: string;
  subtotal?: number;
  descontoValor?: number;
  descontoTexto?: string;
  totalFinal: number;
  companyAddress?: string;
}

export const EspelhoOrcamento: React.FC<EspelhoOrcamentoProps> = ({
  id = 'espelho-oficial-orcamento',
  clientName,
  clientType,
  clientContact,
  consultoraName,
  dataOrcamento,
  observacoes,
  observacoesRodape,
  items,
  freteValor,
  freteEndereco,
  subtotal,
  descontoValor,
  descontoTexto,
  totalFinal,
  companyAddress,
}) => {
  const formatMoney = (val?: number | null) =>
    (typeof val === 'number' && !isNaN(val) ? val : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const calculatedSubtotal =
    typeof subtotal === 'number' && !isNaN(subtotal)
      ? subtotal
      : items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);

  const hasDesconto =
    typeof descontoValor === 'number' &&
    !isNaN(descontoValor) &&
    descontoValor > 0;

  const hasFrete = freteValor > 0;

  // REGRA OFICIAL: No espelho do orçamento, NÃO exibir a porcentagem (mesmo que informada em %).
  // Exibir somente o valor correspondente em R$ + a mensagem de desconto correspondente.
  const rawDescontoTexto =
    descontoTexto && descontoTexto.trim().length > 0
      ? descontoTexto.trim()
      : 'DESCONTO ESPECIAL APLICADO:';
  const displayDescontoTexto =
    rawDescontoTexto
      .replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*%\s*\)/gi, '')
      .replace(/\s*\d+(?:[.,]\d+)?\s*%/gi, '')
      .trim() || 'DESCONTO ESPECIAL APLICADO:';

  return (
    <div
      id={id}
      className="w-full min-w-[960px] max-w-[1040px] mx-auto bg-white text-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#cde2f0] overflow-hidden select-none print:shadow-none print:border print:rounded-none print:min-w-full"
      style={{
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      }}
    >
      {/* ======================================================== */}
      {/* 1. CABEÇALHO OFICIAL COM GEOMETRIA CORPORATIVA FÊNIX */}
      {/* ======================================================== */}
      <div className="relative w-full bg-[#f4f9fd] border-b border-[#cde2f0] overflow-hidden flex items-stretch justify-between min-h-[110px]">
        {/* Subtle geometric facets on the left/top */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1000 120"
            fill="none"
          >
            {/* Top-left subtle facets */}
            <polygon points="0,0 120,0 70,60 0,35" fill="#eaf3fa" opacity="0.8" />
            <polygon points="120,0 240,0 180,45 70,60" fill="#e2edf7" opacity="0.5" />
            <polygon points="0,35 70,60 30,110 0,90" fill="#d9e8f4" opacity="0.4" />
          </svg>
        </div>

        {/* Lado Esquerdo: Logotipo Oficial Fênix World & Dados da Empresa */}
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 py-3 px-5 sm:px-8 min-w-0 flex-1 max-w-[calc(100%-380px)] sm:max-w-[calc(100%-420px)]">
          {/* Logo Oficial Fênix World Exatamente como no modelo oficial */}
          <div className="flex items-center flex-shrink-0">
            <FenixOfficialLogo height={64} className="py-0.5" />
          </div>

          {/* Linha Divisória Ciano/Azul */}
          <div className="h-14 w-[2px] bg-[#00a8e8] flex-shrink-0 self-center" />

          {/* Identificação Oficial da Empresa com quebra automática de linha para endereço grande */}
          <div className="text-left leading-snug min-w-0 flex-1 pr-1 sm:pr-3">
            <h2 className="text-[13.5px] sm:text-[14.5px] font-black tracking-wide text-[#003865] uppercase truncate">
              FÊNIX WORLD DISTRIBUIDORA
            </h2>
            <div className="text-[11.5px] sm:text-[12px] text-slate-600 font-medium mt-0.5 break-words whitespace-normal leading-snug">
              {companyAddress ? (
                companyAddress.split('\n').map((line, idx) => (
                  <p key={idx} className="break-words whitespace-normal">{line}</p>
                ))
              ) : (
                <>
                  <p className="break-words whitespace-normal">R. José Belesso, 368 - Vila Caodaglio</p>
                  <p className="break-words whitespace-normal">Jundiaí - SP, 13216-200</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Banner Angular Azul Marinho "ORÇAMENTO" com Facetas Geométricas */}
        <div className="relative flex items-stretch justify-end flex-shrink-0">
          {/* Facetas geométricas decorativas azuis/escuras ao fundo do recorte */}
          <div className="absolute right-0 top-0 bottom-0 w-[460px] pointer-events-none overflow-hidden">
            <svg
              className="w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 460 120"
              fill="none"
            >
              <polygon points="0,0 80,0 40,120 0,120" fill="#002d54" opacity="0.3" />
              <polygon points="40,0 120,0 80,120 40,120" fill="#00407a" opacity="0.4" />
              <polygon points="80,0 160,0 120,120 80,120" fill="#00569e" opacity="0.25" />
            </svg>
          </div>

          {/* Bloco Slanted Azul Marinho Oficial */}
          <div
            className="w-[370px] sm:w-[410px] bg-[#004f8c] text-white py-4 px-7 flex items-center justify-center gap-4 relative z-10 flex-shrink-0"
            style={{
              clipPath: 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)',
            }}
          >
            {/* Ícone de Prancheta/Documento Branco */}
            <div className="w-10 h-12 rounded-lg border-2 border-white flex flex-col items-center justify-center p-1.5 flex-shrink-0 ml-4">
              <div className="w-full h-1 bg-white rounded-xs mb-1" />
              <div className="w-full h-1 bg-white rounded-xs mb-1" />
              <div className="w-3/4 h-1 bg-white rounded-xs self-start" />
            </div>

            {/* Título ORÇAMENTO e Data */}
            <div className="flex flex-col text-left flex-shrink-0">
              <h1 className="text-[26px] sm:text-[28px] font-black tracking-wider text-white uppercase leading-none whitespace-nowrap">
                ORÇAMENTO
              </h1>
              <span className="text-[12px] sm:text-[13px] font-medium text-sky-100 mt-1.5 whitespace-nowrap">
                Data do Orçamento:{' '}
                <strong className="text-white font-bold">{dataOrcamento}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DADOS DO CLIENTE & INFORMAÇÕES DO ORÇAMENTO (2 BLOCOS) */}
      {/* ======================================================== */}
      <div className="p-5 space-y-4 bg-white">
        <div className="grid grid-cols-2 gap-4">
          {/* Bloco 1: DADOS DO CLIENTE */}
          <div className="rounded-lg border border-[#cde2f0] overflow-hidden bg-white shadow-2xs">
            {/* Barra de Título */}
            <div className="bg-[#005691] text-white px-3.5 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white stroke-[2.4]" />
              </div>
              <span className="text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase">
                DADOS DO CLIENTE
              </span>
            </div>
            {/* Conteúdo */}
            <div className="p-3.5 space-y-2 text-[13px]">
              <div className="flex items-center">
                <span className="w-20 font-bold text-[#003865] flex-shrink-0">
                  Cliente:
                </span>
                <span className="text-slate-800 font-semibold truncate">
                  {clientName || 'Cliente'}
                </span>
              </div>
              <div className="border-t border-[#e8f1f7]" />
              <div className="flex items-center">
                <span className="w-20 font-bold text-[#003865] flex-shrink-0">
                  Contato:
                </span>
                <span className="text-slate-800 font-medium">
                  {clientContact || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Bloco 2: INFORMAÇÕES DO ORÇAMENTO */}
          <div className="rounded-lg border border-[#cde2f0] overflow-hidden bg-white shadow-2xs">
            {/* Barra de Título */}
            <div className="bg-[#005691] text-white px-3.5 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white stroke-[2.4]" />
              </div>
              <span className="text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase">
                INFORMAÇÕES DO ORÇAMENTO
              </span>
            </div>
            {/* Conteúdo */}
            <div className="p-3.5 space-y-2 text-[13px]">
              <div className="flex items-center">
                <span className="w-40 font-bold text-[#003865] flex-shrink-0">
                  {(consultoraName || '').toLowerCase().includes('eder')
                    ? 'Diretor:'
                    : 'Consultora Comercial:'}
                </span>
                <span className="text-slate-800 font-semibold truncate">
                  {consultoraName || 'Vanessa Gomes'}
                </span>
              </div>
              <div className="border-t border-[#e8f1f7]" />
              <div className="flex items-center">
                <span className="w-40 font-bold text-[#003865] flex-shrink-0">
                  Observações:
                </span>
                <span className="text-slate-800 font-medium truncate">
                  {observacoes ? observacoes : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. TABELA DE PRODUTOS: DESCRIÇÃO DOS PRODUTOS */}
        {/* ======================================================== */}
        <div className="rounded-lg border border-[#cde2f0] overflow-hidden bg-white shadow-2xs">
          {/* Top Bar Azul Escuro Oficial */}
          <div className="bg-[#003865] text-white px-4 py-2 flex items-center gap-2.5">
            <Package className="w-4 h-4 text-white stroke-[2.2]" />
            <span className="text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase">
              DESCRIÇÃO DOS PRODUTOS
            </span>
          </div>

          {/* Tabela com Colunas Oficiais e Grades Verticais/Horizontais */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#eef5fa] text-[#003865] text-[11px] sm:text-[12px] font-black uppercase tracking-wider border-b border-[#cde2f0]">
                <th className="py-2.5 px-3 text-center w-[10%] border-r border-[#d4e4f1]">
                  QTD
                </th>
                <th className="py-2.5 px-4 text-center w-[46%] border-r border-[#d4e4f1]">
                  DESCRIÇÃO DO PRODUTO
                </th>
                <th className="py-2.5 px-3 text-center w-[12%] border-r border-[#d4e4f1]">
                  UNID.
                </th>
                <th className="py-2.5 px-4 text-center w-[16%] border-r border-[#d4e4f1]">
                  PREÇO UNITÁRIO
                </th>
                <th className="py-2.5 px-4 text-center w-[16%]">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="text-[12px] sm:text-[13px]">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-slate-400 font-medium italic"
                  >
                    Nenhum produto adicionado ao orçamento.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="border-b border-[#e2eef7] last:border-b-0 hover:bg-[#f9fcfe] transition-colors"
                  >
                    {/* QTD */}
                    <td className="py-2.5 px-3 text-center font-normal text-slate-800 border-r border-[#e2eef7]">
                      <div>{item.qtd}</div>
                    </td>

                    {/* DESCRIÇÃO DO PRODUTO + Subtítulo / Detalhe */}
                    <td className="py-2.5 px-4 text-left border-r border-[#e2eef7]">
                      <div className="text-slate-900 font-normal leading-tight">
                        {item.descricao}
                      </div>
                      {item.subtitulo && (
                        <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide mt-0.5 whitespace-pre-line">
                          {item.subtitulo}
                        </div>
                      )}
                      {!item.subtitulo?.includes(item.qtdDetalhe || '') && item.qtdDetalhe && (
                        <div className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                          {item.qtdDetalhe}
                        </div>
                      )}
                    </td>

                    {/* UNID. */}
                    <td className="py-2.5 px-3 text-center text-slate-700 border-r border-[#e2eef7]">
                      {item.unidade}
                    </td>

                    {/* PREÇO UNITÁRIO */}
                    <td className="py-2.5 px-4 text-center text-slate-800 border-r border-[#e2eef7]">
                      {formatMoney(item.precoUnitario)}
                    </td>

                    {/* TOTAL DO ITEM */}
                    <td className="py-2.5 px-4 text-center font-bold text-[#002244]">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ======================================================== */}
        {/* DESCONTO ESPECIAL APLICADO & SUBTOTAL CONDICIONAL        */}
        {/* Quando houver desconto: exibe [ DESCONTO ] e [ SUBTOTAL ]  */}
        {/* seguindo EXATAMENTE o design, gradiente e proporções     */}
        {/* da imagem de referência.                                 */}
        {/* Quando NÃO houver desconto: não exibe este bloco.         */}
        {/* ======================================================== */}
        {hasDesconto && (
          <div className="flex items-stretch gap-3.5 sm:gap-4">
            {/* 1. BLOCO DE DESCONTO */}
            <div className="flex-1 rounded-2xl border border-[#c6ebd4] bg-[#ebfaf2] py-3.5 px-5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 text-[#065f46] font-black text-[13px] sm:text-[14px] uppercase tracking-wide">
                <Tag className="w-5 h-5 text-[#00875a] stroke-[2.2] flex-shrink-0" />
                <span>{displayDescontoTexto}</span>
              </div>
              <div className="text-[17px] sm:text-[19px] font-black text-[#065f46] whitespace-nowrap pl-2">
                - {formatMoney(descontoValor)}
              </div>
            </div>

            {/* 2. BLOCO DE SUBTOTAL */}
            <div
              className="flex-1 rounded-2xl border border-[#b8d5ec] py-3.5 px-5 flex items-center justify-between shadow-2xs overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, #dbebf8 0%, #dbebf8 25%, #3d87c6 58%, #003865 80%, #003865 100%)',
              }}
            >
              <div className="flex items-center gap-2.5 text-[#003865] font-black text-[13px] sm:text-[14px] uppercase tracking-wider">
                <Calculator className="w-5 h-5 text-[#003865] stroke-[2.2] flex-shrink-0" />
                <span>SUBTOTAL:</span>
              </div>
              <div className="text-[20px] sm:text-[22px] font-black text-white tracking-tight leading-none whitespace-nowrap pl-2">
                {formatMoney(calculatedSubtotal)}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. FRETE & VALOR FINAL EM DESTAQUE (MODELO OFICIAL)      */}
        {/* Exatamente como na referência:                           */}
        {/* [ FRETE ] e ao lado [ TOTAL ]                            */}
        {/* ======================================================== */}
        <div className="flex items-stretch gap-3.5 sm:gap-4 w-full">
          {/* Lado Esquerdo: FRETE */}
          <div className="flex-1 min-w-0 rounded-2xl border border-[#cde2f0] bg-white py-3.5 px-5 flex items-center gap-3.5 shadow-2xs">
            <Truck className="w-7 h-7 text-[#004f8c] stroke-[1.8] flex-shrink-0" />
            <span className="text-[14px] sm:text-[15px] font-black tracking-wider text-[#004f8c] uppercase flex-shrink-0">
              FRETE
            </span>

            {/* Linha Divisória Azul */}
            <div className="h-7 w-[1.5px] bg-[#004f8c]/25 mx-1 flex-shrink-0" />

            {/* Detalhe do Frete: Valor e Endereço */}
            <div className="flex-1 min-w-0 text-left">
              {hasFrete ? (
                <>
                  <div className="text-[15px] font-black text-[#003865] leading-tight">
                    {formatMoney(freteValor)}
                  </div>
                  {freteEndereco && (
                    <div className="text-[11.5px] text-slate-600 font-medium truncate mt-0.5" title={freteEndereco}>
                      {freteEndereco}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[12.5px] font-semibold text-slate-700 truncate">
                  Frete não incluso — a calcular após fechamento.
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: VALOR TOTAL FINAL EM DESTAQUE (Azul Escuro Oficial) */}
          <div className="w-[360px] sm:w-[390px] flex-shrink-0 rounded-2xl bg-[#003865] text-white py-3.5 px-6 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 text-white font-black text-sm">
                <DollarSign className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span className="text-[14px] sm:text-[15px] font-black tracking-wider uppercase text-white whitespace-nowrap">
                TOTAL
              </span>
              <div className="h-6 w-[1.5px] bg-white/40 mx-2 flex-shrink-0" />
            </div>
            <span className="text-[22px] sm:text-[26px] font-black tracking-tight text-white leading-none whitespace-nowrap ml-2 flex-shrink-0">
              {formatMoney(totalFinal)}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. RODAPÉ OFICIAL COM 3 COLUNAS E DIVISÓRIAS             */}
        {/* ======================================================== */}
        <div className="pt-3.5 pb-3 px-2 border-t border-[#e2edf5] flex items-center justify-between">
          {/* Coluna 1: OBSERVAÇÃO */}
          <div className="flex items-center gap-3 w-[34%]">
            {/* Ícone Exclamação em Círculo Azul */}
            <div className="w-9 h-9 rounded-full border-2 border-[#004f8c] flex items-center justify-center flex-shrink-0 text-[#004f8c] font-black text-lg">
              !
            </div>
            <div className="text-left text-xs leading-tight">
              <span className="block font-black text-[#003865] uppercase tracking-wide text-[11px]">
                OBSERVAÇÃO:
              </span>
              <p className="text-slate-600 font-medium text-[11px] mt-0.5 leading-snug">
                {observacoesRodape && observacoesRodape.trim()
                  ? observacoesRodape
                  : 'Não realizamos instalação, indicamos profissionais caso precise!'}
              </p>
            </div>
          </div>

            {/* Divisória Vertical 1 */}
            <div className="h-11 w-[1px] bg-[#cde2f0] flex-shrink-0" />

            {/* Coluna 2: Cursive Script "Obrigado pela confiança!" */}
            <div className="flex flex-col items-center justify-center px-4 w-[32%] text-center">
              <span
                className="text-[26px] sm:text-[29px] text-[#003865] leading-none select-none"
                style={{
                  fontFamily: "'Dancing Script', 'Caveat', 'Brush Script MT', cursive",
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                }}
              >
                Obrigado pela confiança!
              </span>
              {/* Traço Caligráfico SVG */}
              <svg
                className="w-44 h-2.5 text-[#003865] mt-1 opacity-85"
                viewBox="0 0 180 12"
                fill="none"
              >
                <path
                  d="M4 8 C 50 2, 130 2, 176 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Divisória Vertical 2 */}
            <div className="h-11 w-[1px] bg-[#cde2f0] flex-shrink-0" />

            {/* Coluna 3: FALE CONOSCO PELO WHATSAPP */}
            <div className="flex items-center justify-end gap-3 w-[30%]">
              {/* Ícone WhatsApp Oficial com Telefone */}
              <div className="w-10 h-10 rounded-full border-2 border-[#003865] flex items-center justify-center flex-shrink-0 text-[#003865]">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-current"
                >
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.56 20.16 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.39C8.94 7.39 8.68 7.46 8.45 7.7C8.23 7.95 7.6 8.54 7.6 9.74C7.6 10.94 8.47 12.1 8.6 12.27C8.73 12.44 10.33 14.91 12.78 15.97C14.82 16.85 15.24 16.68 15.69 16.63C16.14 16.59 17.14 16.04 17.35 15.45C17.56 14.87 17.56 14.37 17.49 14.26C17.43 14.16 17.26 14.1 17.01 13.97C16.76 13.85 15.53 13.24 15.3 13.16C15.07 13.07 14.91 13.03 14.74 13.28C14.57 13.53 14.09 14.1 13.95 14.26C13.8 14.43 13.66 14.45 13.41 14.33C13.16 14.2 12.11 13.86 10.86 12.75C9.89 11.88 9.23 10.81 9.11 10.6C8.98 10.39 9.09 10.28 9.22 10.15C9.33 10.04 9.47 9.86 9.6 9.71C9.72 9.56 9.77 9.46 9.85 9.29C9.93 9.12 9.89 8.98 9.83 8.85C9.76 8.73 9.27 7.52 9.06 7.03C8.86 6.55 8.66 6.62 8.5 6.61C8.35 6.6 8.18 6.6 8.01 6.6" />
                </svg>
              </div>
              <div className="text-left leading-tight">
                <span className="block text-[10.5px] font-black tracking-wider text-[#003865] uppercase">
                  FALE CONOSCO PELO WHATSAPP
                </span>
                <span className="text-[17px] font-black text-[#003865] tracking-tight">
                  (11) 99374-7618
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
