;;;=============================================================================
;;;  LactaExpert — Sistema Especialista de Anamnese Bovina
;;;  Arquivo: base_regras.clp
;;;  Hackathon UFJF 2026
;;;
;;;  Engenharia de Conhecimento baseada em:
;;;    - Embrapa Circular Técnica 31 (Furlong et al.)
;;;    - Biosseguridade na Bovinocultura Leiteira
;;;    - Perissinotto (ESALQ/USP) — Climatização Inteligente
;;;    - Especificação Clínica LactaExpert (MVP)
;;;
;;;  Motor de Inferência: Forward Chaining com Fatores de Certeza (MYCIN)
;;;  Hierarquia de Saliência:
;;;    100  — EMERGÊNCIA  (TPB)
;;;     90  — URGÊNCIA    (Hipocalcemia)
;;;     80  — ALTA        (Mastite Clínica, Acidose Ruminal)
;;;     60  — MÉDIA-ALTA  (Cetose)
;;;     50  — MÉDIA       (Mastite Subclínica)
;;;     40  — MODERADA    (Afecções Podais)
;;;     30  — COMPLEMENTAR(Estresse Térmico)
;;;     20  — REFINAMENTO (Diagnóstico Diferencial)
;;;     10  — SAÍDA       (Alertas e Recomendações)
;;;      1  — FINAL       (Resumo da Sessão)
;;;=============================================================================


;;;=============================================================================
;;; SEÇÃO 1 — TEMPLATES (Estruturas de Dados)
;;;=============================================================================

(deftemplate sintoma
   "Registro de um sintoma ou sinal clínico observado no animal."
   (slot nome   (type SYMBOL))
   (slot valor  (type SYMBOL NUMBER)
                (default sim)))

(deftemplate contexto
   "Dados zootécnicos e fisiológicos do animal em avaliação."
   (slot dias-em-lactacao    (type INTEGER)
                             (default 0))
   (slot escore-corporal     (type FLOAT)
                             (range 1.0 5.0)
                             (default 3.0))
   (slot producao-leite-litros (type FLOAT)
                               (default 0.0))
   (slot fase                (type SYMBOL)
                             (allowed-symbols pre-parto periparto lactacao seca)
                             (default lactacao))
   (slot raca                (type SYMBOL)
                             (default holandesa))
   (slot idade-meses         (type INTEGER)
                             (default 36))
   (slot historico-doenca    (type SYMBOL)
                             (default nenhum)))

(deftemplate hipotese
   "Hipótese diagnóstica gerada pelo motor de inferência."
   (slot doenca    (type STRING))
   (slot cf        (type FLOAT)
                   (range 0.0 1.0)
                   (default 0.0))
   (slot explicacao (type STRING)))


;;;=============================================================================
;;; SEÇÃO 2 — FUNÇÕES AUXILIARES
;;;=============================================================================

(deffunction cf-combinar (?cf1 ?cf2)
   "Combina dois Fatores de Certeza pelo modelo MYCIN.
    Ambos positivos: CF1 + CF2 * (1 - CF1)
    Ambos negativos: CF1 + CF2 * (1 + CF1)
    Sinais opostos:  (CF1 + CF2) / (1 - min(|CF1|,|CF2|))"
   (if (and (>= ?cf1 0) (>= ?cf2 0))
      then (- (+ ?cf1 ?cf2) (* ?cf1 ?cf2))
      else (if (and (<= ?cf1 0) (<= ?cf2 0))
              then (+ (+ ?cf1 ?cf2) (* ?cf1 ?cf2))
              else (/ (+ ?cf1 ?cf2)
                      (- 1 (min (abs ?cf1) (abs ?cf2)))))))

(deffunction cf-limitar (?cf)
   "Garante que o CF permanece dentro do intervalo [0.0, 1.0]."
   (if (> ?cf 1.0) then (return 1.0))
   (if (< ?cf 0.0) then (return 0.0))
   (return ?cf))


;;;=============================================================================
;;; SEÇÃO 3 — REGRAS: TRISTEZA PARASITÁRIA BOVINA (TPB)
;;; Saliência 100 — EMERGÊNCIA (risco de óbito em 24–48h)
;;; Agentes: Babesia bovis, Babesia bigemina, Anaplasma marginale
;;; Vetor: Rhipicephalus (Boophilus) microplus
;;;=============================================================================

(defrule tpb-febre-alta-anemia
   "TPB: Febre alta (>40°C) associada a anemia — forte suspeita inicial."
   (declare (salience 100))
   (sintoma (nome febre-alta) (valor sim))
   (sintoma (nome anemia) (valor sim))
   (not (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)")))
   =>
   (assert (hipotese
      (doenca "Tristeza Parasitaria Bovina (TPB)")
      (cf 0.7)
      (explicacao "Febre alta com anemia sao sinais classicos de TPB (Babesiose/Anaplasmose)."))))

(defrule tpb-febre-carrapatos
   "TPB: Febre alta com presença de carrapatos — suspeita moderada."
   (declare (salience 99))
   (sintoma (nome febre-alta) (valor sim))
   (sintoma (nome presenca-carrapatos) (valor sim))
   (not (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)")))
   =>
   (assert (hipotese
      (doenca "Tristeza Parasitaria Bovina (TPB)")
      (cf 0.5)
      (explicacao "Febre alta com presenca de Rhipicephalus microplus sugere investigar TPB."))))

(defrule tpb-reforco-ictericia
   "TPB: Icterícia reforça hipótese — hemólise intravascular."
   (declare (salience 100))
   (sintoma (nome ictericia) (valor sim))
   ?h <- (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Ictericia reforça suspeita de TPB — destruicao massiva de hemacias (hemolise intravascular).")))

(defrule tpb-reforco-hemoglobinuria
   "TPB: Urina escura/avermelhada — forte evidência de Babesia bovis."
   (declare (salience 100))
   (sintoma (nome hemoglobinuria) (valor sim))
   ?h <- (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.2)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Hemoglobinuria (urina escura) indica hemolise massiva — tipico de Babesia bovis.")))

(defrule tpb-reforco-carrapatos
   "TPB: Presença de carrapatos confirma exposição ao vetor."
   (declare (salience 100))
   (sintoma (nome presenca-carrapatos) (valor sim))
   ?h <- (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Presenca de Rhipicephalus microplus confirma exposicao ao vetor da TPB.")))

(defrule tpb-reforco-apatia
   "TPB: Apatia e prostração reforçam quadro sistêmico."
   (declare (salience 100))
   (sintoma (nome apatia) (valor sim))
   ?h <- (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Apatia e prostracao indicam comprometimento sistemico por TPB.")))

(defrule tpb-reforco-taquicardia
   "TPB: Taquicardia por anemia severa."
   (declare (salience 100))
   (sintoma (nome taquicardia) (valor sim))
   ?h <- (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Taquicardia compensatoria por anemia severa reforça quadro de TPB.")))


;;;=============================================================================
;;; SEÇÃO 4 — REGRAS: HIPOCALCEMIA (Febre do Leite / Paresia Puerperal)
;;; Saliência 90 — URGÊNCIA (emergência metabólica do periparto)
;;;=============================================================================

(defrule hipocalcemia-vaca-caida-periparto
   "Hipocalcemia: Vaca em decúbito no período periparto — alta suspeita."
   (declare (salience 90))
   (sintoma (nome vaca-caida) (valor sim))
   (contexto (fase periparto))
   (not (hipotese (doenca "Hipocalcemia (Febre do Leite)")))
   =>
   (assert (hipotese
      (doenca "Hipocalcemia (Febre do Leite)")
      (cf 0.75)
      (explicacao "Vaca em decubito no periodo periparto e altamente sugestivo de hipocalcemia."))))

(defrule hipocalcemia-vaca-caida-inicio-lactacao
   "Hipocalcemia: Vaca caída nos primeiros dias de lactação."
   (declare (salience 90))
   (sintoma (nome vaca-caida) (valor sim))
   (contexto (dias-em-lactacao ?del&:(< ?del 10)))
   (not (contexto (fase periparto)))
   (not (hipotese (doenca "Hipocalcemia (Febre do Leite)")))
   =>
   (assert (hipotese
      (doenca "Hipocalcemia (Febre do Leite)")
      (cf 0.65)
      (explicacao "Vaca em decubito nos primeiros 10 dias de lactacao sugere hipocalcemia."))))

(defrule hipocalcemia-reforco-hipotermia
   "Hipocalcemia: Hipotermia (extremidades frias) — sinal clássico."
   (declare (salience 90))
   (sintoma (nome hipotermia) (valor sim))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Hipotermia (extremidades e orelhas frias) reforça quadro de hipocalcemia.")))

(defrule hipocalcemia-reforco-atonia-ruminal
   "Hipocalcemia: Atonia ruminal — ausência de movimentos ruminais."
   (declare (salience 90))
   (sintoma (nome atonia-ruminal) (valor sim))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Atonia ruminal (ausencia de movimentos ruminais) e sinal classico de hipocalcemia.")))

(defrule hipocalcemia-reforco-pupilas-dilatadas
   "Hipocalcemia: Pupilas dilatadas — comprometimento neuromuscular."
   (declare (salience 90))
   (sintoma (nome pupilas-dilatadas) (valor sim))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Pupilas dilatadas indicam comprometimento neuromuscular por deficiencia de calcio.")))

(defrule hipocalcemia-reforco-cabeca-flanco
   "Hipocalcemia: Cabeça voltada para o flanco — postura patognomônica."
   (declare (salience 90))
   (sintoma (nome cabeca-voltada-flanco) (valor sim))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Postura com cabeca voltada para o flanco (auto-auscultacao) e patognomonica de hipocalcemia.")))

(defrule hipocalcemia-reforco-alta-producao
   "Hipocalcemia: Vacas de alta produção (>30L) têm maior risco."
   (declare (salience 89))
   (contexto (producao-leite-litros ?prod&:(> ?prod 30.0)))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Alta producao (>30L/dia) aumenta demanda de Ca e predispoe a hipocalcemia.")))

(defrule hipocalcemia-reforco-multipara
   "Hipocalcemia: Vacas mais velhas são mais susceptíveis."
   (declare (salience 89))
   (contexto (idade-meses ?i&:(> ?i 72)))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Vacas multiparas (>6 anos) tem maior predisposicao a hipocalcemia.")))


;;;=============================================================================
;;; SEÇÃO 5 — REGRAS: MASTITE CLÍNICA
;;; Saliência 80 — ALTA (tratamento imediato necessário)
;;;=============================================================================

(defrule mastite-clinica-leite-alterado
   "Mastite Clínica: Leite com alteração visual — sinal cardinal."
   (declare (salience 80))
   (sintoma (nome leite-alterado) (valor sim))
   (not (hipotese (doenca "Mastite Clinica")))
   =>
   (assert (hipotese
      (doenca "Mastite Clinica")
      (cf 0.6)
      (explicacao "Leite com grumos, coloracao alterada ou aquoso e sinal cardinal de mastite clinica."))))

(defrule mastite-clinica-caneco-positivo-inicio
   "Mastite Clínica: Caneco de fundo preto positivo sem hipótese prévia."
   (declare (salience 80))
   (sintoma (nome teste-caneco-positivo) (valor sim))
   (not (hipotese (doenca "Mastite Clinica")))
   =>
   (assert (hipotese
      (doenca "Mastite Clinica")
      (cf 0.65)
      (explicacao "Teste do caneco de fundo preto positivo (grumos retidos) indica mastite clinica."))))

(defrule mastite-clinica-ubere-dor-inicio
   "Mastite Clínica: Úbere inchado + dor à palpação sem hipótese prévia."
   (declare (salience 79))
   (sintoma (nome ubere-inchado) (valor sim))
   (sintoma (nome dor-palpacao-ubere) (valor sim))
   (not (hipotese (doenca "Mastite Clinica")))
   =>
   (assert (hipotese
      (doenca "Mastite Clinica")
      (cf 0.55)
      (explicacao "Ubere edemaciado com dor a palpacao sugere processo inflamatorio mamario (mastite)."))))

(defrule mastite-clinica-reforco-ubere-inchado
   "Mastite Clínica: Úbere edemaciado reforça diagnóstico."
   (declare (salience 80))
   (sintoma (nome ubere-inchado) (valor sim))
   ?h <- (hipotese (doenca "Mastite Clinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.2)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Ubere edemaciado e com dor a palpacao confirma processo inflamatorio mamario.")))

(defrule mastite-clinica-reforco-febre
   "Mastite Clínica: Febre acompanhando — resposta sistêmica."
   (declare (salience 80))
   (sintoma (nome febre) (valor sim))
   ?h <- (hipotese (doenca "Mastite Clinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Febre associada a alteracao mamaria sugere mastite clinica com resposta sistemica.")))

(defrule mastite-clinica-reforco-caneco
   "Mastite Clínica: Caneco de fundo preto positivo confirma."
   (declare (salience 80))
   (sintoma (nome teste-caneco-positivo) (valor sim))
   ?h <- (hipotese (doenca "Mastite Clinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Teste do caneco de fundo preto positivo (grumos retidos) confirma mastite clinica.")))

(defrule mastite-clinica-reforco-queda-leite
   "Mastite Clínica: Queda na produção do quarto afetado."
   (declare (salience 80))
   (sintoma (nome queda-producao-leite) (valor sim))
   ?h <- (hipotese (doenca "Mastite Clinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Queda na producao de leite acompanha mastite clinica por dano ao tecido mamario.")))


;;;=============================================================================
;;; SEÇÃO 6 — REGRAS: ACIDOSE RUMINAL
;;; Saliência 70 — ALTA (risco de laminite e complicações)
;;;=============================================================================

(defrule acidose-ruminal-diarreia-acida
   "Acidose Ruminal: Diarréia com fezes ácidas/espumosas."
   (declare (salience 70))
   (sintoma (nome diarreia) (valor sim))
   (sintoma (nome fezes-acidas) (valor sim))
   (not (hipotese (doenca "Acidose Ruminal")))
   =>
   (assert (hipotese
      (doenca "Acidose Ruminal")
      (cf 0.6)
      (explicacao "Diarreia com fezes acidas/espumosas e sugestiva de acidose ruminal (SARA ou aguda)."))))

(defrule acidose-ruminal-excesso-concentrado
   "Acidose Ruminal: Histórico de consumo excessivo de concentrado."
   (declare (salience 70))
   (sintoma (nome excesso-concentrado) (valor sim))
   (sintoma (nome diarreia) (valor sim))
   (not (hipotese (doenca "Acidose Ruminal")))
   =>
   (assert (hipotese
      (doenca "Acidose Ruminal")
      (cf 0.55)
      (explicacao "Consumo excessivo de concentrado com diarreia sugere acidose ruminal."))))

(defrule acidose-ruminal-reforco-laminite
   "Acidose Ruminal: Laminite como sequela clássica."
   (declare (salience 70))
   (sintoma (nome laminite) (valor sim))
   ?h <- (hipotese (doenca "Acidose Ruminal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Laminite e sequela classica da acidose ruminal (histamina e endotoxinas na circulacao).")))

(defrule acidose-ruminal-reforco-timpanismo
   "Acidose Ruminal: Timpanismo espumoso acompanha o quadro."
   (declare (salience 70))
   (sintoma (nome timpanismo) (valor sim))
   ?h <- (hipotese (doenca "Acidose Ruminal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Timpanismo espumoso pode acompanhar quadro de acidose ruminal.")))

(defrule acidose-ruminal-reforco-desidratacao
   "Acidose Ruminal: Desidratação e apatia em quadro severo."
   (declare (salience 70))
   (sintoma (nome desidratacao) (valor sim))
   ?h <- (hipotese (doenca "Acidose Ruminal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Desidratacao e apatia acompanham acidose ruminal severa.")))

(defrule acidose-ruminal-reforco-atonia
   "Acidose Ruminal: Atonia ruminal por pH muito baixo."
   (declare (salience 70))
   (sintoma (nome atonia-ruminal) (valor sim))
   ?h <- (hipotese (doenca "Acidose Ruminal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Atonia ruminal ocorre quando o pH ruminal cai abaixo de 5.0 (acidose aguda).")))


;;;=============================================================================
;;; SEÇÃO 7 — REGRAS: CETOSE (Acetonemia)
;;; Saliência 60 — MÉDIA-ALTA (balanço energético negativo)
;;;=============================================================================

(defrule cetose-inapetencia-inicio-lactacao
   "Cetose: Inapetência nos primeiros 60 DEL — balanço energético negativo."
   (declare (salience 60))
   (sintoma (nome inapetencia) (valor sim))
   (contexto (dias-em-lactacao ?del&:(< ?del 60)))
   (not (hipotese (doenca "Cetose")))
   =>
   (assert (hipotese
      (doenca "Cetose")
      (cf 0.5)
      (explicacao "Inapetencia nos primeiros 60 dias de lactacao e sugestiva de cetose (balanco energetico negativo)."))))

(defrule cetose-odor-cetotico-inicio
   "Cetose: Odor cetótico (acetona) detectado sem hipótese prévia."
   (declare (salience 60))
   (sintoma (nome odor-cetotico) (valor sim))
   (not (hipotese (doenca "Cetose")))
   =>
   (assert (hipotese
      (doenca "Cetose")
      (cf 0.7)
      (explicacao "Odor de acetona no halito ou leite e sinal patognomonico de cetose."))))

(defrule cetose-reforco-odor
   "Cetose: Odor cetótico reforça hipótese existente."
   (declare (salience 60))
   (sintoma (nome odor-cetotico) (valor sim))
   ?h <- (hipotese (doenca "Cetose") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.25)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Odor de acetona no halito ou leite e sinal patognomonico de cetose.")))

(defrule cetose-reforco-queda-producao
   "Cetose: Queda abrupta na produção de leite."
   (declare (salience 60))
   (sintoma (nome queda-producao-leite) (valor sim))
   ?h <- (hipotese (doenca "Cetose") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Queda abrupta na producao de leite reforça quadro de cetose.")))

(defrule cetose-reforco-perda-peso
   "Cetose: Perda de escore corporal acelerada (<2.5)."
   (declare (salience 60))
   (sintoma (nome perda-peso) (valor sim))
   (contexto (escore-corporal ?ec&:(< ?ec 2.5)))
   ?h <- (hipotese (doenca "Cetose") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Perda de peso com escore corporal <2.5 indica mobilizacao excessiva de reservas (cetose).")))

(defrule cetose-reforco-bhb
   "Cetose: BHB sanguíneo elevado — confirmação laboratorial."
   (declare (salience 60))
   (sintoma (nome bhb-elevado) (valor sim))
   ?h <- (hipotese (doenca "Cetose") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.2)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Beta-hidroxibutirato (BHB) elevado (>1.2 mmol/L) confirma cetose laboratorialmente.")))

(defrule cetose-reforco-nervosa
   "Cetose: Sinais nervosos (forma nervosa da cetose)."
   (declare (salience 60))
   (sintoma (nome sinais-nervosos) (valor sim))
   ?h <- (hipotese (doenca "Cetose") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Sinais nervosos (andar cambaleante, lamber objetos) podem indicar cetose nervosa.")))


;;;=============================================================================
;;; SEÇÃO 8 — REGRAS: MASTITE SUBCLÍNICA
;;; Saliência 50 — MÉDIA (perda silenciosa de produção)
;;;=============================================================================

(defrule mastite-subclinica-cmt
   "Mastite Subclínica: CMT positivo sem alteração visual do leite."
   (declare (salience 50))
   (sintoma (nome cmt-positivo) (valor sim))
   (not (sintoma (nome leite-alterado) (valor sim)))
   (not (hipotese (doenca "Mastite Subclinica")))
   =>
   (assert (hipotese
      (doenca "Mastite Subclinica")
      (cf 0.7)
      (explicacao "CMT (California Mastitis Test) positivo sem alteracao visual do leite indica mastite subclinica."))))

(defrule mastite-subclinica-ccs
   "Mastite Subclínica: CCS elevada (>200.000/mL) sem sinais clínicos."
   (declare (salience 50))
   (sintoma (nome ccs-elevada) (valor sim))
   (not (sintoma (nome leite-alterado) (valor sim)))
   (not (hipotese (doenca "Mastite Subclinica")))
   =>
   (assert (hipotese
      (doenca "Mastite Subclinica")
      (cf 0.65)
      (explicacao "Contagem de Celulas Somaticas >200.000/mL sem sinais clinicos indica mastite subclinica."))))

(defrule mastite-subclinica-reforco-ccs
   "Mastite Subclínica: CCS elevada reforça CMT positivo."
   (declare (salience 50))
   (sintoma (nome ccs-elevada) (valor sim))
   ?h <- (hipotese (doenca "Mastite Subclinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "CCS elevada em conjunto com CMT positivo reforça mastite subclinica.")))

(defrule mastite-subclinica-reforco-queda-leite
   "Mastite Subclínica: Queda gradual e silenciosa na produção."
   (declare (salience 50))
   (sintoma (nome queda-producao-leite) (valor sim))
   ?h <- (hipotese (doenca "Mastite Subclinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Queda gradual na producao sem sinais clinicos visiveis e tipico de mastite subclinica.")))

(defrule mastite-subclinica-reforco-historico
   "Mastite Subclínica: Histórico de mastite aumenta risco."
   (declare (salience 50))
   (contexto (historico-doenca mastite))
   ?h <- (hipotese (doenca "Mastite Subclinica") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Historico de mastite previa aumenta risco de reincidencia subclinica.")))


;;;=============================================================================
;;; SEÇÃO 9 — REGRAS: AFECÇÕES PODAIS
;;; Saliência 40 — MODERADA (impacto crônico na produção e bem-estar)
;;;=============================================================================

(defrule afeccao-podal-claudicacao
   "Podal: Claudicação (manqueira) observada."
   (declare (salience 40))
   (sintoma (nome claudicacao) (valor sim))
   (not (hipotese (doenca "Afeccao Podal")))
   =>
   (assert (hipotese
      (doenca "Afeccao Podal")
      (cf 0.5)
      (explicacao "Claudicacao (manqueira) indica problema podal que requer avaliacao de cascos."))))

(defrule afeccao-podal-reforco-lesao-interdigital
   "Podal: Lesão interdigital visível — dermatite ou fleimão."
   (declare (salience 40))
   (sintoma (nome lesao-interdigital) (valor sim))
   ?h <- (hipotese (doenca "Afeccao Podal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.2)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Lesao interdigital visivel sugere dermatite digital, fleimao ou erosao de talao.")))

(defrule afeccao-podal-reforco-odor
   "Podal: Odor fétido no casco — processo infeccioso ativo."
   (declare (salience 40))
   (sintoma (nome odor-fetido-casco) (valor sim))
   ?h <- (hipotese (doenca "Afeccao Podal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Odor fetido no casco sugere processo infeccioso podal ativo (necrose).")))

(defrule afeccao-podal-reforco-apoio-anormal
   "Podal: Animal evita apoiar o membro afetado."
   (declare (salience 40))
   (sintoma (nome apoio-anormal) (valor sim))
   ?h <- (hipotese (doenca "Afeccao Podal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Apoio anormal (deslocamento de peso) indica dor podal significativa.")))

(defrule afeccao-podal-reforco-laminite
   "Podal: Laminite diagnosticada."
   (declare (salience 40))
   (sintoma (nome laminite) (valor sim))
   ?h <- (hipotese (doenca "Afeccao Podal") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Laminite identificada — pode ter origem nutricional (acidose) ou mecanica.")))


;;;=============================================================================
;;; SEÇÃO 10 — REGRAS: ESTRESSE TÉRMICO
;;; Saliência 30 — COMPLEMENTAR (manejo ambiental)
;;; Referência: Perissinotto (ESALQ/USP) — ITU e parâmetros fisiológicos
;;;=============================================================================

(defrule estresse-termico-itu-fr
   "Estresse Térmico: ITU elevado com frequência respiratória aumentada."
   (declare (salience 30))
   (sintoma (nome itu-elevado) (valor sim))
   (sintoma (nome frequencia-respiratoria-alta) (valor sim))
   (not (hipotese (doenca "Estresse Termico")))
   =>
   (assert (hipotese
      (doenca "Estresse Termico")
      (cf 0.6)
      (explicacao "ITU elevado (>72) com frequencia respiratoria aumentada (>60 mov/min) indica estresse calorico."))))

(defrule estresse-termico-temp-retal
   "Estresse Térmico: Temperatura retal elevada com ITU alto."
   (declare (salience 30))
   (sintoma (nome temperatura-retal-elevada) (valor sim))
   (sintoma (nome itu-elevado) (valor sim))
   (not (hipotese (doenca "Estresse Termico")))
   =>
   (assert (hipotese
      (doenca "Estresse Termico")
      (cf 0.55)
      (explicacao "Temperatura retal elevada (>39.5C) com ITU alto sugere estresse calorico."))))

(defrule estresse-termico-reforco-queda-leite
   "Estresse Térmico: Queda de produção por calor."
   (declare (salience 30))
   (sintoma (nome queda-producao-leite) (valor sim))
   ?h <- (hipotese (doenca "Estresse Termico") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.15)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Queda de producao associada a ITU elevado confirma impacto do estresse termico.")))

(defrule estresse-termico-reforco-salivacao
   "Estresse Térmico: Salivação excessiva e boca aberta."
   (declare (salience 30))
   (sintoma (nome salivacao-excessiva) (valor sim))
   ?h <- (hipotese (doenca "Estresse Termico") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Salivacao excessiva e respiracao com boca aberta sao mecanismos de termorregulacao.")))

(defrule estresse-termico-reforco-agrupamento-sombra
   "Estresse Térmico: Animais agrupados na sombra."
   (declare (salience 30))
   (sintoma (nome agrupamento-sombra) (valor sim))
   ?h <- (hipotese (doenca "Estresse Termico") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.05)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Agrupamento na sombra e comportamento de busca de conforto termico.")))

(defrule estresse-termico-reforco-reducao-ingestao
   "Estresse Térmico: Redução da ingestão de matéria seca."
   (declare (salience 30))
   (sintoma (nome inapetencia) (valor sim))
   ?h <- (hipotese (doenca "Estresse Termico") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (cf-combinar ?cf-atual 0.1)))
   (modify ?h (cf ?novo-cf)
              (explicacao "Reducao da ingestao de materia seca e resposta fisiologica ao estresse calorico.")))


;;;=============================================================================
;;; SEÇÃO 11 — REGRAS DE DIAGNÓSTICO DIFERENCIAL
;;; Saliência 20 — Refinamento e resolução de conflitos
;;;=============================================================================

(defrule diferencial-febre-descarta-hipocalcemia
   "Diferencial: Febre alta é INCOMPATÍVEL com hipocalcemia (que cursa com hipotermia)."
   (declare (salience 20))
   (sintoma (nome febre-alta) (valor sim))
   ?h <- (hipotese (doenca "Hipocalcemia (Febre do Leite)") (cf ?cf-atual))
   =>
   (bind ?novo-cf (cf-limitar (* ?cf-atual 0.3)))
   (modify ?h (cf ?novo-cf)
              (explicacao "ATENCAO: Febre alta e INCOMPATIVEL com hipocalcemia (que cursa com hipotermia). CF reduzido significativamente.")))

(defrule diferencial-tpb-prioridade-sobre-mastite
   "Diferencial: TPB com CF superior pode estar mascarando sinais confundidos com mastite."
   (declare (salience 20))
   (hipotese (doenca "Mastite Clinica") (cf ?cf1))
   (hipotese (doenca "Tristeza Parasitaria Bovina (TPB)") (cf ?cf2&:(> ?cf2 ?cf1)))
   =>
   (printout t ">> DIFERENCIAL: TPB com CF superior (" ?cf2 ") pode estar causando sinais confundidos com mastite (" ?cf1 "). Priorizar tratamento de TPB." crlf))

(defrule diferencial-cetose-vs-acidose
   "Diferencial: Cetose e Acidose podem coexistir — balanço energético."
   (declare (salience 20))
   (hipotese (doenca "Cetose") (cf ?cf1&:(> ?cf1 0.4)))
   (hipotese (doenca "Acidose Ruminal") (cf ?cf2&:(> ?cf2 0.4)))
   =>
   (printout t ">> DIFERENCIAL: Cetose (CF:" ?cf1 ") e Acidose Ruminal (CF:" ?cf2 ") podem coexistir. Avaliar manejo nutricional completo." crlf))

(defrule diferencial-laminite-acidose-podal
   "Diferencial: Laminite pode ser sequela de acidose ruminal."
   (declare (salience 20))
   (hipotese (doenca "Afeccao Podal") (cf ?cf1&:(> ?cf1 0.4)))
   (hipotese (doenca "Acidose Ruminal") (cf ?cf2&:(> ?cf2 0.4)))
   =>
   (printout t ">> DIFERENCIAL: Afeccao podal (CF:" ?cf1 ") pode ser SEQUELA de acidose ruminal (CF:" ?cf2 "). Tratar a causa primaria." crlf))

(defrule diferencial-estresse-vs-cetose
   "Diferencial: Estresse térmico pode agravar cetose."
   (declare (salience 20))
   (hipotese (doenca "Estresse Termico") (cf ?cf1&:(> ?cf1 0.4)))
   (hipotese (doenca "Cetose") (cf ?cf2&:(> ?cf2 0.4)))
   =>
   (printout t ">> DIFERENCIAL: Estresse termico (CF:" ?cf1 ") reduz ingestao e pode AGRAVAR cetose (CF:" ?cf2 "). Priorizar climatizacao." crlf))

(defrule diferencial-subclinica-para-clinica
   "Diferencial: Mastite subclínica pode evoluir para clínica."
   (declare (salience 20))
   (hipotese (doenca "Mastite Subclinica") (cf ?cf1&:(> ?cf1 0.5)))
   (hipotese (doenca "Mastite Clinica") (cf ?cf2&:(> ?cf2 0.5)))
   =>
   (printout t ">> DIFERENCIAL: Mastite subclinica (CF:" ?cf1 ") pode ter evoluido para clinica (CF:" ?cf2 "). Priorizar tratamento da forma clinica." crlf))


;;;=============================================================================
;;; SEÇÃO 12 — REGRAS DE ALERTA E RECOMENDAÇÃO FINAL
;;; Saliência 10 — Camada de saída e orientação ao operador
;;;=============================================================================

(defrule alerta-emergencia
   "ALERTA VERMELHO: CF >= 0.8 — Ação veterinária IMEDIATA."
   (declare (salience 10))
   (hipotese (doenca ?d) (cf ?cf&:(>= ?cf 0.8)) (explicacao ?e))
   =>
   (printout t crlf)
   (printout t "╔══════════════════════════════════════════════════════════════╗" crlf)
   (printout t "║          >>> ALERTA DE EMERGENCIA — CF >= 0.8 <<<          ║" crlf)
   (printout t "╠══════════════════════════════════════════════════════════════╣" crlf)
   (printout t "║ Doenca: " ?d crlf)
   (printout t "║ Fator de Certeza: " ?cf crlf)
   (printout t "║ Justificativa: " ?e crlf)
   (printout t "║ ACAO: Acionar medico veterinario IMEDIATAMENTE.            ║" crlf)
   (printout t "╚══════════════════════════════════════════════════════════════╝" crlf))

(defrule alerta-atencao
   "ALERTA AMARELO: CF entre 0.5 e 0.8 — Monitoramento e agendamento."
   (declare (salience 10))
   (hipotese (doenca ?d) (cf ?cf&:(and (>= ?cf 0.5) (< ?cf 0.8))) (explicacao ?e))
   =>
   (printout t crlf)
   (printout t "┌──────────────────────────────────────────────────────────────┐" crlf)
   (printout t "│        >> ATENCAO: Suspeita Identificada — CF >= 0.5 <<     │" crlf)
   (printout t "├──────────────────────────────────────────────────────────────┤" crlf)
   (printout t "│ Doenca: " ?d crlf)
   (printout t "│ Fator de Certeza: " ?cf crlf)
   (printout t "│ Justificativa: " ?e crlf)
   (printout t "│ ACAO: Agendar avaliacao veterinaria. Monitorar evolucao.    │" crlf)
   (printout t "└──────────────────────────────────────────────────────────────┘" crlf))

(defrule alerta-investigar
   "ALERTA AZUL: CF < 0.5 — Investigação adicional necessária."
   (declare (salience 10))
   (hipotese (doenca ?d) (cf ?cf&:(and (> ?cf 0.0) (< ?cf 0.5))) (explicacao ?e))
   =>
   (printout t crlf)
   (printout t "  [i] Possibilidade: " ?d " (CF: " ?cf ")" crlf)
   (printout t "      " ?e crlf)
   (printout t "      Recomendacao: Coletar mais evidencias clinicas e laboratoriais." crlf))


;;;=============================================================================
;;; SEÇÃO 13 — REGRA DE ENCERRAMENTO DA SESSÃO
;;; Saliência 1 — Executa por último, após todos os diagnósticos
;;;=============================================================================

(defrule resumo-sessao-com-hipoteses
   "Resumo: Exibe sumário quando existem hipóteses geradas."
   (declare (salience 1))
   (exists (hipotese))
   =>
   (printout t crlf)
   (printout t "================================================================" crlf)
   (printout t "  RESUMO DA SESSAO DE ANAMNESE — LactaExpert v1.0" crlf)
   (printout t "  Hackathon UFJF 2026" crlf)
   (printout t "================================================================" crlf)
   (printout t "  Hipoteses foram geradas com base nos sintomas informados." crlf)
   (printout t "  Priorize as hipoteses com MAIOR Fator de Certeza (CF)." crlf)
   (printout t "" crlf)
   (printout t "  IMPORTANTE: Este sistema e uma ferramenta de APOIO a decisao." crlf)
   (printout t "  NAO substitui o diagnostico veterinario profissional." crlf)
   (printout t "================================================================" crlf))

(defrule resumo-sessao-sem-hipoteses
   "Resumo: Nenhuma hipótese gerada — dados insuficientes."
   (declare (salience 1))
   (not (hipotese))
   (exists (sintoma))
   =>
   (printout t crlf)
   (printout t "================================================================" crlf)
   (printout t "  SESSAO INCONCLUSIVA — LactaExpert v1.0" crlf)
   (printout t "================================================================" crlf)
   (printout t "  Os sintomas informados nao foram suficientes para gerar" crlf)
   (printout t "  hipoteses diagnosticas. Recomenda-se:" crlf)
   (printout t "    1. Coletar mais sinais clinicos do animal." crlf)
   (printout t "    2. Informar dados de contexto (DEL, ECC, fase)." crlf)
   (printout t "    3. Consultar medico veterinario presencialmente." crlf)
   (printout t "================================================================" crlf))


;;;=============================================================================
;;; FIM DO ARQUIVO base_regras.clp
;;; Total de enfermidades cobertas: 8
;;;   1. Tristeza Parasitaria Bovina (TPB)  — Salience 100
;;;   2. Hipocalcemia (Febre do Leite)      — Salience  90
;;;   3. Mastite Clinica                     — Salience  80
;;;   4. Acidose Ruminal                     — Salience  70
;;;   5. Cetose (Acetonemia)                — Salience  60
;;;   6. Mastite Subclinica                  — Salience  50
;;;   7. Afeccao Podal                       — Salience  40
;;;   8. Estresse Termico                    — Salience  30
;;;=============================================================================
