const fs = require('fs');

let code = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const startIdx = code.indexOf('{/* Contenedor Principal (Izquierda Bloques / Derecha Totales) */}');
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
                        <table className="w-full text-sm">
                            <thead className="border-b-2 border-gray-900 text-left">
                                <tr>
                                    <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider">Concepto</th>
                                    <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider text-center">Ref</th>
                                    <th className="py-2 text-xs font-black text-gray-900 uppercase tracking-wider text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                
                                <tr>
                                    <td colSpan={3} className="py-3 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50/50 pl-2">Ingresos Operativos</td>
                                </tr>
                                
                                <tr className="hover:bg-gray-50">
                                    <td className="py-3 pl-4">
                                        <div className="font-bold text-gray-900 text-sm">Componente Personal</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Escala aplicada ({fmtPct.format(activeData?.escalaGen || 0)}) sobre {activeData?.cabezasGeneral || 0} cabezas propias.</div>
                                        
                                        <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-200 text-[10px] space-y-1">
                                            <div className="flex justify-between w-64">
                                                <span className="text-red-700 font-medium">Inv: {activeData?.cabInv || 0} cab</span>
                                                <span className="font-bold text-red-800">{fmt.format(activeData?.resInv || 0)}</span>
                                            </div>
                                            <div className="flex justify-between w-64">
                                                <span className="text-blue-700 font-medium">Faena: {activeData?.cabFaena || 0} cab</span>
                                                <span className="font-bold text-blue-800">{fmt.format(activeData?.resFaena || 0)}</span>
                                            </div>
                                            <div className="flex justify-between w-64">
                                                <span className="text-yellow-700 font-medium">Cría: {activeData?.cabCria || 0} cab</span>
                                                <span className="font-bold text-yellow-800">{fmt.format(activeData?.resCria || 0)}</span>
                                            </div>
                                            {(activeData?.cabMag || 0) > 0 && (
                                            <div className="flex justify-between w-64">
                                                <span className="text-gray-900 font-medium">MAG: {activeData?.cabMag || 0} cab</span>
                                                <span className="font-bold text-emerald-800">{fmt.format(activeData?.resMag || 0)}</span>
                                            </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 text-center align-top pt-4">
                                        <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">{fmtPct.format(activeData?.escalaGen || 0)}</span>
                                    </td>
                                    <td className="py-3 text-right font-semibold text-gray-900 align-top pt-4">{fmt.format(activeData?.componenteP || 0)}</td>
                                </tr>

                                {(activeData?.componenteR || 0) > 0 && (
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 pl-4">
                                            <div className="font-bold text-gray-900 text-sm">Componente Regional</div>
                                            <div className="text-[10px] text-gray-500 mt-1">Tajada ({fmtPct.format(activeData?.tajadaRegion || 0)}) de la Bolsa Provincial.</div>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-bold border border-green-200">{fmtPct.format(activeData?.bolsaRegion || 0)}</span>
                                        </td>
                                        <td className="py-3 text-right font-semibold text-gray-900">{fmt.format(activeData?.componenteR || 0)}</td>
                                    </tr>
                                )}

                                {(activeData?.opOficina || 0) > 0 && (
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 pl-4">
                                            <div className="font-bold text-gray-900 text-sm">Componente Oficina</div>
                                            <div className="text-[10px] text-gray-500 mt-1">Distribución ({fmtPct.format(activeData?.opOficina || 0)}) sobre Bolsa Directas.</div>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="inline-flex px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-bold border border-purple-200">{fmtPct.format(activeData?.escalaOficina || 0)}</span>
                                        </td>
                                        <td className="py-3 text-right font-semibold text-gray-900">{fmt.format(activeData?.componenteO || 0)}</td>
                                    </tr>
                                )}

                                <tr>
                                    <td colSpan={3} className="py-3 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50/50 pl-2">Ajustes Contractuales y Gastos</td>
                                </tr>
                                
                                <tr className="hover:bg-gray-50">
                                    <td className="py-3 pl-4">
                                        <div className="font-bold text-gray-900 text-sm">Complemento Mínimo Garantizado</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Ajuste para cubrir el piso salarial asegurado ({fmt.format(activeData?.minimo || 0)}).</div>
                                    </td>
                                    <td className="py-3 text-center">-</td>
                                    <td className="py-3 text-right font-semibold text-gray-900">
                                        {activeData?.componenteP < activeData?.minimo && activeData?.minimo > 0 ? fmt.format(activeData.minimo - activeData.componenteP) : "$ 0"}
                                    </td>
                                </tr>

                                {((activeData?.amortizacioneDcac || 0) > 0 || (activeData?.ajustes || 0) !== 0) && (
                                <tr className="hover:bg-gray-50">
                                    <td className="py-3 pl-4">
                                        <div className="font-bold text-red-700 text-sm">Descuentos y Amortizaciones</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Amortización Vehículo dCaC o Retenciones.</div>
                                    </td>
                                    <td className="py-3 text-center">-</td>
                                    <td className="py-3 text-right font-bold text-red-700">
                                        {fmt.format(-((activeData?.amortizacioneDcac || 0) + (activeData?.ajustes || 0)))}
                                    </td>
                                </tr>
                                )}

                                <tr className="border-y-2 border-gray-900 bg-gray-50">
                                    <td colSpan={2} className="py-4 pl-4 text-sm font-black uppercase tracking-widest text-gray-900">Total Sueldo Bruto A Facturar</td>
                                    <td className="py-4 text-right font-black text-xl text-gray-900">{fmt.format(activeData?.cierreReal || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">Datos Operativos (Rendiciones Posteriores)</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-gray-700">Reintegro Movilidad (KMS declarados)</span>
                                    <span className="font-bold text-gray-900">{(activeData?.reintegroMovilidad || 0) > 0 ? fmt.format(activeData.reintegroMovilidad) : '--'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-gray-700">Gastos Marketing / Mendel</span>
                                    <span className="font-bold text-gray-900">{(activeData?.gastosMkt || 0) > 0 ? fmt.format(activeData.gastosMkt) : '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
`;

const finalCode = code.substring(0, startIdx) + newUI + '\\n' + code.substring(endIdx);
fs.writeFileSync('frontend/src/App.tsx', finalCode);
console.log('UI successfully replaced');
