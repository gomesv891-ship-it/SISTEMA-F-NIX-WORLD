import React from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
} from 'lucide-react';
import { EstoqueItem, MovimentacaoEstoque } from '../../types';

interface EstoqueResumoViewProps {
  items: EstoqueItem[];
  movimentacoes: MovimentacaoEstoque[];
}

export function EstoqueResumoView({ items }: EstoqueResumoViewProps) {
  const totalProdutos = items.length;

  // Contagens por status
  const normalCount = items.filter((it) => it.status === 'Normal').length;
  const atencaoCount = items.filter((it) => it.status === 'Atenção').length;
  const baixoCount = items.filter((it) => it.status === 'Estoque baixo').length;
  const zeradoCount = items.filter((it) => it.status === 'Sem estoque').length;
  const baixoTotalCount = baixoCount + zeradoCount;

  // Percentuais
  const normalPct = totalProdutos > 0 ? Math.round((normalCount / totalProdutos) * 100) : 0;
  const atencaoPct = totalProdutos > 0 ? Math.round((atencaoCount / totalProdutos) * 100) : 0;
  const baixoPct = totalProdutos > 0 ? Math.round((baixoTotalCount / totalProdutos) * 100) : 0;
  const zeradoPct = totalProdutos > 0 ? Math.round((zeradoCount / totalProdutos) * 100) : 0;

  // Saldo físico total
  const saldoFisicoTotal = items.reduce((acc, it) => acc + (Number(it.estoqueAtual) || 0), 0);

  // Agrupamento por Categoria
  const categoriaMap = items.reduce((acc, it) => {
    const cat = it.categoria?.trim() || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoriasOrdenadas = Object.entries(categoriaMap)
    .map(([nome, count]) => ({
      nome,
      count,
      pct: totalProdutos > 0 ? Math.round((count / totalProdutos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Agrupamento por Marca
  const marcaMap = items.reduce((acc, it) => {
    const brand = it.marca?.trim() || 'Outras';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const marcasOrdenadas = Object.entries(marcaMap)
    .map(([nome, count]) => ({
      nome,
      count,
      pct: totalProdutos > 0 ? Math.round((count / totalProdutos) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top 5 Maior Estoque
  const top5MaiorEstoque = [...items]
    .sort((a, b) => (b.estoqueAtual || 0) - (a.estoqueAtual || 0))
    .slice(0, 5);

  // Top 5 Menor Estoque
  const top5MenorEstoque = [...items]
    .sort((a, b) => (a.estoqueAtual || 0) - (b.estoqueAtual || 0))
    .slice(0, 5);

  // Donut SVG Calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Segments for Donut: Normal, Atenção, Baixo, Zerado
  const normalStroke = totalProdutos > 0 ? (normalCount / totalProdutos) * circumference : 0;
  const atencaoStroke = totalProdutos > 0 ? (atencaoCount / totalProdutos) * circumference : 0;
  const baixoStroke = totalProdutos > 0 ? (baixoCount / totalProdutos) * circumference : 0;
  const zeradoStroke = totalProdutos > 0 ? (zeradoCount / totalProdutos) * circumference : 0;

  const normalOffset = 0;
  const atencaoOffset = -normalStroke;
  const baixoOffset = -(normalStroke + atencaoStroke);
  const zeradoOffset = -(normalStroke + atencaoStroke + baixoStroke);

  return (
    <div className="space-y-6">
      {/* Subtítulo informativo da aba Resumo */}
      <div className="text-xs text-slate-500 font-medium -mt-2">
        Visão geral do seu estoque, com indicadores e análises por categoria, grupo e marca.
      </div>

      {/* 4 Cards de Indicadores Superiores (Espelho da Imagem 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Produtos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Total de Produtos</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {totalProdutos.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">itens no catálogo</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Saldo total físico</span>
            <span className="font-bold text-slate-900">
              {Math.round(saldoFisicoTotal).toLocaleString('pt-BR')} un
            </span>
          </div>
        </div>

        {/* Card 2: Estoque Normal */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Estoque Normal</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                {normalCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">produtos no nível ideal</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${normalPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-emerald-700 font-semibold">✓ {normalPct}% do total</span>
              <span>Ideal</span>
            </div>
          </div>
        </div>

        {/* Card 3: Produtos em Atenção */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Produtos em Atenção</span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">
                {atencaoCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">próximos do mínimo</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${atencaoPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-amber-700 font-semibold">⏰ {atencaoPct}% do total</span>
              <span>Monitorar</span>
            </div>
          </div>
        </div>

        {/* Card 4: Produtos com Estoque Baixo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Produtos com estoque baixo</span>
              <span className="text-2xl font-bold text-rose-600 mt-1 block">
                {baixoTotalCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                ({zeradoCount} zerados, {baixoCount} baixos)
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${baixoPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-rose-700 font-semibold">⚠️ {baixoPct}% do total</span>
              <span>Repor</span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO CENTRAL: 3 GRÁFICOS / CARDS (Status, Categoria, Marca) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Produtos por Status (Donut Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Produtos por Status</h3>
          </div>

          {totalProdutos === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Package className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Nenhum produto cadastrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastre produtos para visualizar a distribuição.</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between gap-4">
              {/* Donut Chart SVG */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  {/* Fundo cinza */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {/* Normal (Verde) */}
                  {normalCount > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="18"
                      strokeDasharray={`${normalStroke} ${circumference}`}
                      strokeDashoffset={normalOffset}
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Em Atenção (Âmbar) */}
                  {atencaoCount > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="18"
                      strokeDasharray={`${atencaoStroke} ${circumference}`}
                      strokeDashoffset={atencaoOffset}
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Baixo (Vermelho) */}
                  {baixoCount > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth="18"
                      strokeDasharray={`${baixoStroke} ${circumference}`}
                      strokeDashoffset={baixoOffset}
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Zerado (Slate) */}
                  {zeradoCount > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#94a3b8"
                      strokeWidth="18"
                      strokeDasharray={`${zeradoStroke} ${circumference}`}
                      strokeDashoffset={zeradoOffset}
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                {/* Texto Central do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-900 leading-tight">{totalProdutos}</span>
                  <span className="text-[10px] text-slate-400">produtos</span>
                </div>
              </div>

              {/* Legenda à direita */}
              <div className="flex-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-600 font-medium">Normal</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {normalCount} <span className="text-slate-400 font-normal">({normalPct}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-slate-600 font-medium">Em atenção</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {atencaoCount} <span className="text-slate-400 font-normal">({atencaoPct}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <span className="text-slate-600 font-medium">Estoque baixo</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {baixoCount} <span className="text-slate-400 font-normal">({Math.round((baixoCount / (totalProdutos || 1)) * 100)}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                    <span className="text-slate-600 font-medium">Zerado</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {zeradoCount} <span className="text-slate-400 font-normal">({zeradoPct}%)</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Produtos por Categoria (Barras Horizontais) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Produtos por Categoria</h3>
          </div>

          {categoriasOrdenadas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Layers className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Nenhum produto cadastrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastre produtos com categorias para ver a divisão.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-56 pr-1">
              {categoriasOrdenadas.map((cat, idx) => {
                const bgOpacities = ['bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200'];
                const barColor = bgOpacities[idx % bgOpacities.length];
                return (
                  <div key={cat.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{cat.nome}</span>
                      <span className="font-bold text-slate-800">
                        {cat.count} <span className="text-slate-400 font-normal">{cat.pct}%</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 3: Produtos por Marca (Barras Horizontais) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Produtos por Marca</h3>
          </div>

          {marcasOrdenadas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Award className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Nenhum produto cadastrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastre produtos com marcas para ver a divisão.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-56 pr-1">
              {marcasOrdenadas.map((marca, idx) => {
                const bgOpacities = ['bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200'];
                const barColor = bgOpacities[idx % bgOpacities.length];
                return (
                  <div key={marca.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">{marca.nome}</span>
                      <span className="font-bold text-slate-800">
                        {marca.count} <span className="text-slate-400 font-normal">{marca.pct}%</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${marca.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BLOCO INFERIOR: TOP 5 MAIOR ESTOQUE E TOP 5 MENOR ESTOQUE (Espelho da Imagem 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 — Maior Estoque */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Top 5 — Maior Estoque</h3>
            </div>
            <span className="text-[11px] text-slate-400">Itens com maior quantidade física</span>
          </div>

          {top5MaiorEstoque.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum produto cadastrado no estoque.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3.5 w-8">#</th>
                    <th className="py-2.5 px-3.5">Produto</th>
                    <th className="py-2.5 px-3.5">Categoria</th>
                    <th className="py-2.5 px-3.5">Marca</th>
                    <th className="py-2.5 px-3.5 text-right">Estoque Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top5MaiorEstoque.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-xs truncate">
                        {it.produto}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">{it.categoria}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{it.marca}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        {Math.round(it.estoqueAtual)} {it.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top 5 — Menor Estoque */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900">Top 5 — Menor Estoque</h3>
            </div>
            <span className="text-[11px] text-slate-400">Itens com maior risco de desabastecimento</span>
          </div>

          {top5MenorEstoque.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum produto cadastrado no estoque.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3.5 w-8">#</th>
                    <th className="py-2.5 px-3.5">Produto</th>
                    <th className="py-2.5 px-3.5">Categoria</th>
                    <th className="py-2.5 px-3.5">Marca</th>
                    <th className="py-2.5 px-3.5 text-right">Estoque Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top5MenorEstoque.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 max-w-xs truncate">
                        {it.produto}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">{it.categoria}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{it.marca}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-600">
                        {Math.round(it.estoqueAtual)} {it.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
