const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const startIdx = code.indexOf('{/* TABLA P&L ESTILO SIMULADOR */}');
const endIdx = code.indexOf('{/* CIERRE DEL CONTENEDOR max-w-[1400px] */}');

const newUI = `
                    {/* TABLA P&L ESTILO SIMULADOR */}
                    <div className="p-4 md:p-8">
                        {activeData?.componenteP < activeData?.minimo && activeData?.minimo > 0 && (
                            <div className="mb-6 p-3 bg-gray-50 border border-gray-300 rounded flex items-start gap-3">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-xs uppercase">Rendimiento bajo Mínimo Garantizado</h4>
                                    <p className="text-gray-600 text-[10px] mt-0.5 leading-tight">
                                        El ingreso operativo calculado ({fmt.format(activeData?.componenteP || 0)}) no cubre el Fijo Garantizado. Se consolida el pago al valor del Mínimo ({fmt.format(activeData?.minimo || 0)}) y se inhabilitan bonos colectivos.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                            {/* COLUMNA IZQUIERDA: Componentes Operativos */}
                            <div>
                                <table className="w-full text-sm">
                                    <thead className="border-b-2 border-gray-900 text-left">
                                        <tr>
                                            <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider">Concepto Operativo</th>
                                            <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider text-center">Ref</th>
                                            <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        
                                        <tr className="hover:bg-gray-50">
                                            <td className="py-3 pr-2">
                                                <div className="font-bold text-gray-900 text-sm">Componente Personal</div>
                                                <div className="text-xs text-gray-500 mt-1">Escala aplicada ({fmtPct.format(activeData?.escalaGen || 0)}) sobre {activeData?.cabezasGeneral || 0} cabezas.</div>
                                                
                                                <div className="mt-2 pl-3 border-l-2 border-gray-300 text-xs space-y-1.5">
                                                    <div className="flex justify-between w-full max-w-[200px]">
                                                        <span className="text-gray-600 font-medium">Inv: {activeData?.cabInv || 0} cab</span>
                                                        <span className="font-bold text-gray-800">{fmt.format(activeData?.resInv || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between w-full max-w-[200px]">
                                                        <span className="text-gray-600 font-medium">Faena: {activeData?.cabFaena || 0} cab</span>
                                                        <span className="font-bold text-gray-800">{fmt.format(activeData?.resFaena || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between w-full max-w-[200px]">
                                                        <span className="text-gray-600 font-medium">Cría: {activeData?.cabCria || 0} cab</span>
                                                        <span className="font-bold text-gray-800">{fmt.format(activeData?.resCria || 0)}</span>
                                                    </div>
                                                    {(activeData?.cabMag || 0) > 0 && (
                                                    <div className="flex justify-between w-full max-w-[200px]">
                                                        <span className="text-gray-900 font-medium">MAG: {activeData?.cabMag || 0} cab</span>
                                                        <span className="font-bold text-gray-900">{fmt.format(activeData?.resMag || 0)}</span>
                                                    </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 text-center align-top pt-4">
                                                <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-bold border border-gray-300">{fmtPct.format(activeData?.escalaGen || 0)}</span>
                                            </td>
                                            <td className="py-3 text-right font-semibold text-gray-900 align-top pt-4">{fmt.format(activeData?.componenteP || 0)}</td>
                                        </tr>

                                        {(activeData?.componenteR || 0) > 0 && (
                                            <tr className="hover:bg-gray-50">
                                                <td className="py-3 pr-2">
                                                    <div className="font-bold text-gray-900 text-sm">Componente Regional</div>
                                                    <div className="text-[10px] text-gray-500 mt-1">Tajada ({fmtPct.format(activeData?.tajadaRegion || 0)}) de la Bolsa.</div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-bold border border-gray-300">{fmtPct.format(activeData?.bolsaRegion || 0)}</span>
                                                </td>
                                                <td className="py-3 text-right font-semibold text-gray-900">{fmt.format(activeData?.componenteR || 0)}</td>
                                            </tr>
                                        )}

                                        {(activeData?.opOficina || 0) > 0 && (
                                            <tr className="hover:bg-gray-50">
                                                <td className="py-3 pr-2">
                                                    <div className="font-bold text-gray-900 text-sm">Componente Oficina</div>
                                                    <div className="text-[10px] text-gray-500 mt-1">Distribución ({fmtPct.format(activeData?.opOficina || 0)}) sobre Directas.</div>
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-bold border border-gray-300">{fmtPct.format(activeData?.escalaOficina || 0)}</span>
                                                </td>
                                                <td className="py-3 text-right font-semibold text-gray-900">{fmt.format(activeData?.componenteO || 0)}</td>
                                            </tr>
                                        )}
                                        <tr className="border-y-2 border-gray-300 bg-gray-50/50">
                                            <td colSpan={2} className="py-3 pl-2 text-xs font-black uppercase tracking-widest text-gray-700">Subtotal Componentes</td>
                                            <td className="py-3 text-right font-black text-gray-800">
                                                {fmt.format((activeData?.componenteP || 0) + (activeData?.componenteR || 0) + (activeData?.componenteO || 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* COLUMNA DERECHA: P&L (Mínimo, Variable, Final) */}
                            <div>
                                <table className="w-full text-sm">
                                    <thead className="border-b-2 border-gray-900 text-left">
                                        <tr>
                                            <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider">Concepto Contractual</th>
                                            <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        
                                        <tr className="hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    Mínimo Garantizado Asegurado
                                                    {((activeData?.componenteP || 0) + (activeData?.componenteR || 0) + (activeData?.componenteO || 0)) >= (activeData?.minimo || 0) && (
                                                        <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-900 text-white rounded-full text-[10px]">✓</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1">Piso salarial asegurado para la categoría.</div>
                                            </td>
                                            <td className="py-3 text-right font-semibold text-gray-900">
                                                {fmt.format(activeData?.minimo || 0)}
                                            </td>
                                        </tr>

                                        <tr className="hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="font-bold text-gray-900 text-sm">Ajuste Variable por Productividad</div>
                                                <div className="text-[10px] text-gray-500 mt-1">Excedente de los componentes operativos sobre el mínimo garantizado.</div>
                                            </td>
                                            <td className="py-3 text-right font-semibold text-gray-900">
                                                {(() => {
                                                    const totalComp = (activeData?.componenteP || 0) + (activeData?.componenteR || 0) + (activeData?.componenteO || 0);
                                                    const minimo = activeData?.minimo || 0;
                                                    return totalComp > minimo ? fmt.format(totalComp - minimo) : "$ 0";
                                                })()}
                                            </td>
                                        </tr>

                                        {((activeData?.amortizacioneDcac || 0) > 0 || (activeData?.ajustes || 0) !== 0) && (
                                        <tr className="hover:bg-gray-50">
                                            <td className="py-3">
                                                <div className="font-bold text-red-700 text-sm">Descuentos y Amortizaciones</div>
                                                <div className="text-[10px] text-gray-500 mt-1">Amortización Vehículo dCaC o Retenciones.</div>
                                            </td>
                                            <td className="py-3 text-right font-bold text-red-700">
                                                {fmt.format(-((activeData?.amortizacioneDcac || 0) + (activeData?.ajustes || 0)))}
                                            </td>
                                        </tr>
                                        )}

                                        <tr className="border-y-2 border-gray-900 bg-gray-50">
                                            <td className="py-5 pl-4 text-base font-black uppercase tracking-widest text-gray-900">Total A Facturar</td>
                                            <td className="py-5 text-right font-black text-2xl text-gray-900">{fmt.format(activeData?.cierreReal || 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">Rendiciones Posteriores</h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-700">Reintegro Movilidad (KMS)</span>
                                            <span className="font-bold text-gray-900">{(activeData?.reintegroMovilidad || 0) > 0 ? fmt.format(activeData.reintegroMovilidad) : '--'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-700">Gastos Marketing / Mendel</span>
                                            <span className="font-bold text-gray-900">{(activeData?.gastosMkt || 0) > 0 ? fmt.format(activeData.gastosMkt) : '--'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
`;

code = code.substring(0, startIdx) + newUI + '\\n' + code.substring(endIdx);
fs.writeFileSync('frontend/src/App.tsx', code);
console.log('UI updated');
