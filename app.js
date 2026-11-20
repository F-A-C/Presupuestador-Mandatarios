import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import {
          getAuth,
          signInWithEmailAndPassword,
          signOut,
          onAuthStateChanged,
          sendPasswordResetEmail
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'gestoria-corrientes';
    let db = null;
    let auth = null;
    let currentUser = null;
    let isCloudActive = false;

    // Mandatario Configuration
    const GESTOR_CONFIG = {
      studioName: "GESTORÍA AUTOMOTOR CORRIENTES",
      gestorName: "Dra. María Laura Benítez",
      matricula: "Matr. DNRPA Nº 48.912",
      phone: "3794-223344",
      email: "contacto@gestoriacorrientes.com",
      address: "Junín 1420, Corrientes Capital"
    };

    const STORAGE_KEYS = {
      budgets: 'gestoria_presupuestos_v2',
      config: 'gestoria_config_v2',
      draft: 'gestoria_borrador_v2'
    };

    let activeStorageUid = null;

    // Checklist template according to procedure
    const PROCEDURE_DOCUMENTS = {
      transferencia: [
        { id: "doc_titulo", name: "Título de Propiedad (Digital CAT o Físico)", default: true },
        { id: "doc_cedula", name: "Cédula Verde / Identificación del Vehículo", default: true },
        { id: "doc_08", name: "Formulario 08 (Firmado y Certificado por ambas partes)", default: true },
        { id: "doc_f12", name: "Verificación Policial F-12 (Vigente 150 días)", default: true },
        { id: "doc_dni", name: "DNI Comprador y Vendedor (Fotocopias vigentes)", default: true },
        { id: "doc_cuil", name: "Constancia de CUIL / CUIT (Comprador y Vendedor)", default: true },
        { id: "doc_acor", name: "Libre Deuda Patente Automotor (ACOR / Municipio)", default: false },
        { id: "doc_multas", name: "Libre Deuda Infracciones (SUGIT / Provincial)", default: false }
      ],
      inscripcion_inicial: [
        { id: "doc_factura", name: "Factura de Compra de la Concesionaria", default: true },
        { id: "doc_cert_fab", name: "Certificado de Fabricación / Aduana", default: true },
        { id: "doc_01", name: "Formulario 01 firmado por concesionaria", default: true },
        { id: "doc_f12", name: "Verificación Policial F-12 (si aplica)", default: false },
        { id: "doc_dni", name: "DNI Comprador / Adquirente", default: true },
        { id: "doc_cuil", name: "Constancia de CUIL / CUIT Adquirente", default: true }
      ],
      denuncia_venta: [
        { id: "doc_08_copia", name: "Constancia o boleto de compraventa entregado", default: true },
        { id: "doc_datos_comp", name: "Nombre, DNI y Domicilio real del adquirente", default: true },
        { id: "doc_dni_titular", name: "DNI Titular Registral solicitante", default: true },
        { id: "doc_cuil_titular", name: "Constancia de CUIL / CUIT Titular", default: true }
      ],
      informe_dominio: [
        { id: "doc_dominio", name: "Número de dominio / Patente a consultar", default: true },
        { id: "doc_interes", name: "Acreditación de interés legítimo", default: true }
      ],
      duplicado_cedula: [
        { id: "doc_denuncia", name: "Denuncia policial o manifestación por extravío", default: true },
        { id: "doc_dni_titular", name: "DNI Titular Registral", default: true },
        { id: "doc_titulo", name: "Título o constancia de radicación", default: true }
      ],
      baja_unidad: [
        { id: "doc_chapas", name: "Placas metálicas de identificación (Chapas)", default: true },
        { id: "doc_titulo", name: "Título de Propiedad original", default: true },
        { id: "doc_cedulas", name: "Todas las cédulas emitidas vigentes", default: true },
        { id: "doc_f04", name: "Formulario 04 firmado", default: true }
      ],
      cambio_radicacion: [
        { id: "doc_titulo", name: "Título de Propiedad original", default: true },
        { id: "doc_cedula", name: "Cédula de Identificación", default: true },
        { id: "doc_f02", name: "Formulario 02 de cambio de radicación", default: true },
        { id: "doc_domicilio", name: "Certificado de Domicilio o nuevo DNI en Corrientes", default: true }
      ]
    };

    let budgetDatabase = [
      {
        id: "PRE-2026-0038",
        date: "2026-09-02",
        updatedAt: "2026-09-02T14:30:00Z",
        status: "Aceptado",
        client: {
          name: "Carlos Alberto Valenzuela",
          dni: "20-28491022-4",
          phone: "3794551122",
          email: "carlos.valenzuela@gmail.com",
          city: "Corrientes",
          province: "Corrientes",
          seccional: "Corrientes Nº 2"
        },
        vehicle: {
          dominio: "AE 772 XX",
          model: "Toyota Hilux 2.8 TDI DX",
          year: "2020",
          origin: "nacional",
          valuation: 22000000
        },
        procedure: "transferencia",
        costs: {
          dnrpaRate: 1.5,
          dgrRate: 1.5,
          dnrpaAmt: 330000,
          dgrAmt: 330000,
          formsFixed: 38500,
          f12Verif: 26000,
          acorTax: 9500,
          subtotalRegistral: 734000,
          honorarioBase: 85000,
          complexityFactor: 1.0,
          honorariosTotal: 85000,
          totalGeneral: 819000,
          anticipo: 776500
        },
        checklist: [
          { name: "Título de Propiedad (Digital CAT o Físico)", status: "recibido" },
          { name: "Cédula Verde", status: "recibido" },
          { name: "Formulario 08", status: "recibido" },
          { name: "Verificación Policial F-12", status: "recibido" },
          { name: "DNI Partes", status: "recibido" },
          { name: "Constancia de CUIL / CUIT", status: "recibido" },
          { name: "Libre Deuda ACOR", status: "pendiente" }
        ]
      },
      {
        id: "PRE-2026-0039",
        date: "2026-09-04",
        updatedAt: "2026-09-04T10:15:00Z",
        status: "Pendiente",
        client: {
          name: "Silvia Beatriz Romero",
          dni: "27-31902441-3",
          phone: "3777401199",
          email: "s.romero@hotmail.com",
          city: "Goya",
          province: "Corrientes",
          seccional: "Goya Seccional Única"
        },
        vehicle: {
          dominio: "AC 390 TY",
          model: "Chevrolet Onix 1.4 LT",
          year: "2018",
          origin: "nacional",
          valuation: 9800000
        },
        procedure: "transferencia",
        costs: {
          dnrpaRate: 1.5,
          dgrRate: 1.5,
          dnrpaAmt: 147000,
          dgrAmt: 147000,
          formsFixed: 38500,
          f12Verif: 26000,
          acorTax: 7000,
          subtotalRegistral: 365500,
          honorarioBase: 70000,
          complexityFactor: 1.25,
          honorariosTotal: 87500,
          totalGeneral: 453000,
          anticipo: 409250
        },
        checklist: [
          { name: "Título de Propiedad", status: "recibido" },
          { name: "Cédula Verde", status: "recibido" },
          { name: "Constancia de CUIL / CUIT", status: "recibido" },
          { name: "Formulario 08", status: "pendiente" }
        ]
      }
    ];

    function loadStoredAppData() {
      try {
        const storedConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.config));
        if (storedConfig && typeof storedConfig === 'object') {
          Object.assign(GESTOR_CONFIG, storedConfig);
        }

        const budgetKey = activeStorageUid
          ? `${STORAGE_KEYS.budgets}_${activeStorageUid}`
          : STORAGE_KEYS.budgets;
        const storedBudgets = JSON.parse(localStorage.getItem(budgetKey));
        if (Array.isArray(storedBudgets)) {
          budgetDatabase = storedBudgets;
        }
      } catch (error) {
        console.warn('No se pudieron restaurar los datos locales:', error);
      }
    }

    function persistBudgets() {
      try {
        const budgetKey = activeStorageUid
          ? `${STORAGE_KEYS.budgets}_${activeStorageUid}`
          : STORAGE_KEYS.budgets;
        localStorage.setItem(budgetKey, JSON.stringify(budgetDatabase));
      } catch (error) {
        console.error('No se pudieron guardar los presupuestos localmente:', error);
        showToast('No se pudo guardar una copia local.', 'error');
      }
    }

    function persistConfig() {
      try {
        localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(GESTOR_CONFIG));
      } catch (error) {
        console.error('No se pudo guardar la configuración:', error);
      }
    }

    function generateBudgetId() {
      const year = new Date().getFullYear();
      const sequenceKeys = budgetDatabase
        .map(item => Number(String(item.id || '').match(/-(\d+)$/)?.[1]))
        .filter(Number.isFinite);
      const nextSequence = Math.max(0, ...sequenceKeys) + 1;
      let id = `PRE-${year}-${String(nextSequence).padStart(4, '0')}`;
      while (budgetDatabase.some(item => item.id === id)) {
        id = `PRE-${year}-${String(++nextSequence).padStart(4, '0')}`;
      }
      return id;
    }

    function validateBudgetData(data) {
      const errors = [];
      if (!data.clientName || data.clientName === 'Cliente') errors.push('nombre del cliente');
      if (!data.clientDni || data.clientDni === '-') errors.push('DNI/CUIT');
      if (!data.clientProvince) errors.push('provincia');
      if (!data.clientCity) errors.push('localidad/municipio');
      if (!Number.isInteger(Number(data.vehicleYear)) ||
          Number(data.vehicleYear) < 1900 ||
          Number(data.vehicleYear) > 2026) errors.push('año/modelo');
      if (!data.vehicleType) errors.push('tipo de vehículo');
      if (!data.vehicleDominio || data.vehicleDominio === 'SIN DOM') errors.push('dominio del vehículo');
      if (!data.vehicleModel || data.vehicleModel === 'Vehículo sin especificar') errors.push('modelo del vehículo');
      if (!data.vehicleValuation || data.vehicleValuation <= 0) errors.push('valuación');
      return errors;
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    let currentDocStatus = {};
    let activeBudgetId = "PRE-2026-0040";
    let autoSaveTimer = null;

    let docExportConfig = {
      paperSize: 'a4',
      orientation: 'portrait',
      showHeader: true,
      showBreakdown: true,
      showFees: true,
      showDocs: true,
      showAnticipo: true,
      validityDays: 10,
      customNotes: '',
      autoSave: true
    };

    async function initCloudSync() {
      try {
        let firebaseConfig = window.GESTORIA_FIREBASE_CONFIG || null;
        if (typeof __firebase_config !== 'undefined') {
          firebaseConfig = JSON.parse(__firebase_config);
        }

        if (!firebaseConfig) {
          isCloudActive = false;
          renderRecentBudgetsBar();
          renderHistoryTable();
          updateBadgeCount();
          return;
        }

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        onAuthStateChanged(auth, handleAuthStateChange);

      } catch (err) {
        console.warn("Cloud persistence initialized with local memory fallback:", err);
        showToast('No se pudo conectar la sincronización segura.', 'error');
      }
    }

    let unsubscribeBudgets = null;

    async function handleAuthStateChange(user) {
      currentUser = user;

      if (unsubscribeBudgets) {
        unsubscribeBudgets();
        unsubscribeBudgets = null;
      }

      const syncLabel = document.getElementById('sync-status-text');
      if (!user) {
        activeStorageUid = null;
        isCloudActive = false;
        budgetDatabase = [];
        if (syncLabel) syncLabel.textContent = "Sin iniciar sesión";
        renderRecentBudgetsBar();
        renderHistoryTable();
        updateBadgeCount();
        showLoginScreen();
        return;
      }

      activeStorageUid = user.uid;
      loadStoredAppData();
      await restoreDraft();
      recalcAndRender();
      isCloudActive = true;
      if (syncLabel) syncLabel.textContent = "Sincronizado en la nube";
      hideLoginScreen();

      const budgetsCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'presupuestos');
      unsubscribeBudgets = onSnapshot(budgetsCollection, (snapshot) => {
        const cloudItems = [];
        snapshot.forEach(docSnap => cloudItems.push(docSnap.data()));
        cloudItems.sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date));
        if (cloudItems.length > 0) budgetDatabase = cloudItems;
        renderRecentBudgetsBar();
        renderHistoryTable();
        updateBadgeCount();
      }, (error) => {
        console.error("Firestore sync error:", error);
        if (syncLabel) syncLabel.textContent = "Error de sincronización";
        showToast('No fue posible sincronizar los presupuestos.', 'error');
      });
    }

    function triggerFormUpdate() {
      recalcAndRender();
      persistDraft();

      // Auto-save debounce (1.2 seconds of idle typing)
      clearTimeout(autoSaveTimer);
      const pill = document.getElementById('auto-save-pill');
      const timeSpan = document.getElementById('auto-save-time');
      if (pill && timeSpan) {
        pill.className = "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1";
        timeSpan.textContent = "Guardando...";
      }

      autoSaveTimer = setTimeout(() => {
        saveCurrentBudget(true); // silent auto-save
      }, 1200);
    }

    function persistDraft() {
      try {
        const draftKey = activeStorageUid
          ? `${STORAGE_KEYS.draft}_${activeStorageUid}`
          : STORAGE_KEYS.draft;
        const fields = [
          'client-name', 'client-dni', 'client-phone', 'client-email',
          'client-province', 'client-city',
          'client-seccional', 'procedure-type', 'vehicle-dominio', 'vehicle-model',
          'vehicle-year', 'vehicle-type', 'vehicle-origin', 'vehicle-valuation'
        ];
        const draft = {};
        fields.forEach(id => {
          const element = document.getElementById(id);
          if (element) draft[id] = element.value;
        });
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (error) {
        console.warn('No se pudo guardar el borrador local:', error);
      }
    }

    function populateVehicleYearOptions(selectedYear = '') {
      const select = document.getElementById('vehicle-year');
      select.replaceChildren();

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Seleccionar año';
      select.appendChild(placeholder);

      for (let year = 1900; year <= 2026; year++) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = String(year);
        select.appendChild(option);
      }

      select.value = String(selectedYear || '');
    }

    let localityRequestId = 0;
    let seccionalRequestId = 0;
    let registryDirectory = null;
    const REGISTRY_DIRECTORY_CACHE_KEY = 'gestoria_dnrpa_registros_v1';

    async function loadRegistryDirectory() {
      if (registryDirectory) return registryDirectory;

      let cachedOffices = null;
      try {
        const cached = JSON.parse(localStorage.getItem(REGISTRY_DIRECTORY_CACHE_KEY) || 'null');
        if (Array.isArray(cached)) cachedOffices = cached;
      } catch (error) {
        console.warn('No se pudo leer la caché de registros seccionales:', error);
      }

      try {
        const response = await fetch('./registros-seccionales.json');
        if (!response.ok) throw new Error(`El directorio DNRPA respondió ${response.status}`);
        const directory = await response.json();
        if (!Array.isArray(directory.offices)) {
          throw new Error('El directorio DNRPA tiene un formato inválido.');
        }
        registryDirectory = directory.offices;
        try {
          localStorage.setItem(REGISTRY_DIRECTORY_CACHE_KEY, JSON.stringify(registryDirectory));
        } catch (error) {
          console.warn('No se pudo guardar la caché de registros seccionales:', error);
        }
      } catch (error) {
        console.warn('No se pudo cargar el directorio DNRPA:', error);
        if (!cachedOffices) throw error;
        registryDirectory = cachedOffices;
        showToast('Sin conexión: se muestran los registros seccionales guardados.', 'info');
      }

      return registryDirectory;
    }

    function normalizeDirectoryText(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .toLocaleUpperCase('es');
    }

    function getLocalSeccionales(province, locality) {
      if (!province || !locality || !Array.isArray(registryDirectory)) return [];
      const normalizedProvince = normalizeDirectoryText(province);
      const normalizedLocality = normalizeDirectoryText(locality);
      const isCaba = normalizedProvince === normalizeDirectoryText('Ciudad Autónoma de Buenos Aires');

      return registryDirectory
        .filter(office =>
          normalizeDirectoryText(office.province) === normalizedProvince &&
          normalizeDirectoryText(office.locality) ===
            (isCaba ? 'CABA' : normalizedLocality)
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    function renderSeccionalOptions(province, locality, selectedSeccional = '') {
      const select = document.getElementById('client-seccional');
      const offices = getLocalSeccionales(province, locality);
      select.replaceChildren();

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = !locality || offices.length
        ? 'Seleccionar registro'
        : 'No hay registros publicados para esta localidad';
      select.appendChild(placeholder);

      const selectedMatch = offices.find(
        office => normalizeDirectoryText(office.name) === normalizeDirectoryText(selectedSeccional)
      );
      if (selectedSeccional && !selectedMatch) {
        const savedOption = document.createElement('option');
        savedOption.value = selectedSeccional;
        savedOption.textContent = `${selectedSeccional} (guardado)`;
        select.appendChild(savedOption);
      }

      offices.forEach(office => {
        const option = document.createElement('option');
        option.value = office.name;
        option.textContent = office.name;
        select.appendChild(option);
      });

      select.value = selectedMatch?.name || selectedSeccional || '';
      select.disabled = !province || !locality;
    }

    async function loadSeccionalOptions(province, locality, selectedSeccional = '') {
      const requestId = ++seccionalRequestId;
      if (!province || !locality) {
        renderSeccionalOptions(province, locality, selectedSeccional);
        return;
      }

      try {
        await loadRegistryDirectory();
      } catch (error) {
        console.error('No se pudo cargar la lista de registros seccionales:', error);
        showToast('No se pudo cargar la lista de registros seccionales.', 'error');
      }
      if (requestId !== seccionalRequestId ||
          document.getElementById('client-province').value !== province ||
          document.getElementById('client-city').value !== locality) return;
      renderSeccionalOptions(province, locality, selectedSeccional);
    }

    function renderLocalityOptions(localities, selectedLocality = '') {
      const select = document.getElementById('client-city');
      select.replaceChildren();

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Seleccionar localidad';
      select.appendChild(placeholder);

      const selectedMatch = localities.find(
        item => item.nombre.toLocaleLowerCase('es') === selectedLocality.toLocaleLowerCase('es')
      );
      const hasSelected = Boolean(selectedMatch);
      if (selectedLocality && !hasSelected) {
        const savedOption = document.createElement('option');
        savedOption.value = selectedLocality;
        savedOption.textContent = `${selectedLocality} (guardada)`;
        select.appendChild(savedOption);
      }

      localities.forEach(item => {
        const option = document.createElement('option');
        option.value = item.nombre;
        option.textContent = item.nombre;
        select.appendChild(option);
      });

      select.value = selectedMatch?.nombre || selectedLocality || '';
      select.disabled = false;
    }

    async function loadLocalities(province, selectedLocality = '') {
      const select = document.getElementById('client-city');
      const requestId = ++localityRequestId;
      if (!province) {
        renderLocalityOptions([], selectedLocality);
        return;
      }

      const cacheKey = `georef_localities_${province}`;
      let cachedLocalities = [];
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        if (Array.isArray(cached)) cachedLocalities = cached;
      } catch (error) {
        console.warn('No se pudo leer la caché de localidades:', error);
      }

      if (cachedLocalities.length) {
        renderLocalityOptions(cachedLocalities, selectedLocality);
      } else {
        select.replaceChildren();
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Cargando localidades...';
        select.appendChild(loadingOption);
        select.disabled = true;
      }

      try {
        const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(province)}&campos=id,nombre&max=5000`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Georef respondió ${response.status}`);
        const data = await response.json();
        const localities = (data.localidades || [])
          .map(item => ({ id: item.id, nombre: item.nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        if (!localities.length) throw new Error('La API no devolvió localidades para la provincia.');
        try {
          localStorage.setItem(cacheKey, JSON.stringify(localities));
        } catch (cacheError) {
          console.warn('No se pudo guardar la caché de localidades:', cacheError);
        }

        if (requestId === localityRequestId &&
            document.getElementById('client-province').value === province) {
          const currentLocality = document.getElementById('client-city').value;
          const localityToKeep = selectedLocality || localities.find(
            item => item.nombre.toLocaleLowerCase('es') === currentLocality.toLocaleLowerCase('es')
          )?.nombre || '';
          renderLocalityOptions(localities, localityToKeep);
        }
      } catch (error) {
        console.warn(`No se pudieron cargar localidades de ${province}:`, error);
        if (requestId !== localityRequestId ||
            document.getElementById('client-province').value !== province) return;
        if (cachedLocalities.length) {
          showToast('Sin conexión: se muestran las localidades guardadas.', 'info');
        } else {
          renderLocalityOptions([], selectedLocality);
          select.disabled = true;
          showToast('No se pudo cargar la lista de localidades. Revisá la conexión e intentá de nuevo.', 'error');
        }
      }
    }

    function onProvinceChange() {
      const province = document.getElementById('client-province').value;
      seccionalRequestId++;
      renderSeccionalOptions('', '', '');
      loadLocalities(province);
      triggerFormUpdate();
    }

    async function onLocalityChange() {
      await loadSeccionalOptions(
        document.getElementById('client-province').value,
        document.getElementById('client-city').value
      );
      triggerFormUpdate();
    }

    async function restoreDraft() {
      try {
        const draftKey = activeStorageUid
          ? `${STORAGE_KEYS.draft}_${activeStorageUid}`
          : STORAGE_KEYS.draft;
        const draft = JSON.parse(localStorage.getItem(draftKey));
        if (!draft) return;
        const province = draft['client-province'] || '';
        const selectedLocality = draft['client-city'] || '';
        const selectedSeccional = draft['client-seccional'] || '';
        Object.entries(draft).filter(([id]) => id !== 'client-city' && id !== 'client-seccional').forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element) element.value = value;
        });
        if (province) {
          await loadLocalities(province, selectedLocality);
        } else if (selectedLocality) {
          renderLocalityOptions([], selectedLocality);
        }
        await loadSeccionalOptions(province, selectedLocality, selectedSeccional);
      } catch (error) {
        console.warn('No se pudo recuperar el borrador local:', error);
      }
    }

    async function saveCurrentBudget(isAuto = false) {
      const data = recalcAndRender();

      const validationErrors = validateBudgetData(data);
      if (validationErrors.length > 0) {
        if (!isAuto) {
          showToast(`Complete: ${validationErrors.join(', ')}.`, 'error');
        }
        return;
      }

      const checklistItems = [];
      const docs = PROCEDURE_DOCUMENTS[data.procedureKey] || PROCEDURE_DOCUMENTS.transferencia;
      docs.forEach(d => {
        checklistItems.push({
          id: d.id,
          name: d.name,
          status: currentDocStatus[d.id] || 'pendiente'
        });
      });

      const now = new Date();
      const currentIso = now.toISOString();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newBudget = {
        id: activeBudgetId,
        date: currentIso.split('T')[0],
        updatedAt: currentIso,
        status: document.getElementById('budget-status-pill').textContent || "Pendiente",
        client: {
          name: data.clientName,
          dni: data.clientDni,
          phone: data.clientPhone,
          email: document.getElementById('client-email').value,
          city: data.clientCity,
          province: data.clientProvince,
          seccional: data.clientSeccional
        },
        vehicle: {
          dominio: data.vehicleDominio,
          model: data.vehicleModel,
          year: data.vehicleYear,
          type: data.vehicleType,
          origin: data.vehicleOrigin,
          valuation: data.vehicleValuation
        },
        procedure: data.procedureKey,
        procedureName: data.procedureText,
        costs: {
          dnrpaRate: data.dnrpaRate,
          dgrRate: data.dgrRate,
          dnrpaAmt: data.dnrpaAmt,
          dgrAmt: data.dgrAmt,
          formsFixed: data.costFormsFixed,
          f12Verif: data.costF12,
          acorTax: data.costAcor,
          subtotalRegistral: data.subtotalRegistral,
          honorarioBase: data.honorarioBase,
          complexityFactor: data.complexityFactor,
          honorariosTotal: data.honorariosTotal,
          totalGeneral: data.totalGeneral,
          anticipo: data.anticipoAmt
        },
        checklist: checklistItems
      };

      // Check if already in array
      const existingIndex = budgetDatabase.findIndex(b => b.id === activeBudgetId);
      if (existingIndex >= 0) {
        budgetDatabase[existingIndex] = newBudget;
      } else {
        budgetDatabase.unshift(newBudget);
      }

      persistBudgets();

      // If cloud database active, save document to strict path
      if (isCloudActive && db && currentUser) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'presupuestos', activeBudgetId);
          await setDoc(docRef, newBudget, { merge: true });
        } catch (e) {
          console.error("Cloud save error:", e);
        }
      }

      // Update UI Indicator
      const pill = document.getElementById('auto-save-pill');
      const timeSpan = document.getElementById('auto-save-time');
      if (pill && timeSpan) {
        pill.className = "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1";
        timeSpan.textContent = `Auto-guardado (${timeStr})`;
      }

      if (!isAuto) {
        showToast(`Presupuesto #${activeBudgetId} guardado correctamente.`, "success");
      }

      renderRecentBudgetsBar();
      renderHistoryTable();
      updateBadgeCount();
    }

    function manualSaveCurrentBudget() {
      saveCurrentBudget(false);
    }

    function createNewBudgetDraft() {
      saveCurrentBudget(true); // Save current one first so no progress is lost
      activeBudgetId = generateBudgetId();
      document.getElementById('preview-budget-id').textContent = `#${activeBudgetId}`;
      document.getElementById('client-name').value = '';
      document.getElementById('client-dni').value = '';
      document.getElementById('client-phone').value = '';
      document.getElementById('client-email').value = '';
      document.getElementById('client-province').value = '';
      loadLocalities('', '');
      seccionalRequestId++;
      renderSeccionalOptions('', '', '');
      document.getElementById('vehicle-dominio').value = '';
      document.getElementById('vehicle-model').value = '';
      document.getElementById('vehicle-year').value = '';
      document.getElementById('vehicle-type').value = '';
      document.getElementById('vehicle-valuation').value = '10000000';
      document.getElementById('budget-status-pill').textContent = 'Borrador';
      initChecklist(document.getElementById('procedure-type').value);
      recalcAndRender();
      showToast(`Nuevo presupuesto en blanco #${activeBudgetId} iniciado.`, "info");
    }

    function renderRecentBudgetsBar() {
      const container = document.getElementById('recent-budgets-chips');
      const countLabel = document.getElementById('recent-count-label');
      if (!container) return;

      container.innerHTML = '';
      if (countLabel) countLabel.textContent = budgetDatabase.length;

      if (budgetDatabase.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-slate-400 italic">No hay presupuestos guardados aún.</span>`;
        return;
      }

      // Display up to 4 most recent
      const recents = budgetDatabase.slice(0, 4);
      recents.forEach(b => {
        const chip = document.createElement('div');
        chip.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition shrink-0 ${b.id === activeBudgetId ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`;
        chip.innerHTML = `
          <span class="font-mono font-bold uppercase text-[10px] bg-white px-1 py-0.2 rounded border border-slate-200">${escapeHtml(b.vehicle?.dominio || 'S/D')}</span>
          <span class="truncate max-w-[100px] text-[11px]">${escapeHtml((b.client?.name || '').split(' ')[0])}</span>
          <span class="text-emerald-700 font-bold text-[11px]">$${formatCurrency(b.costs.totalGeneral)}</span>
          <button onclick="event.stopPropagation(); openQuickViewModal('${b.id}')" title="Ver comprobante guardado" class="ml-1 text-slate-400 hover:text-brand-600">
            <i class="fa-solid fa-eye text-[10px]"></i>
          </button>
        `;
        chip.onclick = () => loadBudgetIntoForm(b.id);
        container.appendChild(chip);
      });
    }

    function openQuickViewModal(id) {
      const b = budgetDatabase.find(x => x.id === id);
      if (!b) return;

      const modal = document.getElementById('quick-view-modal');
      const title = document.getElementById('qv-title');
      const subtitle = document.getElementById('qv-subtitle');
      const body = document.getElementById('qv-body');
      const actionsBar = document.getElementById('qv-actions-bar');

      title.textContent = `Presupuesto #${b.id}`;
      subtitle.textContent = `Guardado: ${b.date} • ${b.vehicle.dominio} - ${b.vehicle.model}`;

      let docRowsHtml = '';
      if (b.checklist && b.checklist.length > 0) {
        docRowsHtml = b.checklist.map(d => {
          let badge = `<span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">Pendiente</span>`;
          if (d.status === 'recibido') {
            badge = `<span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] font-semibold">Recibido</span>`;
          } else if (d.status === 'no_aplica') {
            badge = `<span class="text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">N/A</span>`;
          }
          return `<div class="flex items-center justify-between py-1 border-b border-slate-100 text-[11px]">
            <span class="text-slate-700">${d.name}</span>
            ${badge}
          </div>`;
        }).join('');
      }

      body.innerHTML = `
        <!-- Client and Auto Info -->
        <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase block">Cliente</span>
            <strong class="text-slate-900 block text-xs truncate">${b.client.name}</strong>
            <span class="text-slate-500 block text-[11px]">${b.client.phone}</span>
            <span class="text-slate-500 block text-[11px]">${escapeHtml([b.client.city, b.client.province].filter(Boolean).join(', '))}</span>
          </div>
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase block">Automotor</span>
            <strong class="text-slate-900 block text-xs truncate">${b.vehicle.model}${b.vehicle.type ? ` • ${b.vehicle.type}` : ''}</strong>
            <span class="font-mono font-bold bg-white px-1.5 py-0.5 rounded border inline-block text-[11px] mt-0.5">${b.vehicle.dominio}</span>
            <span class="text-slate-500 block text-[11px] mt-0.5">Valuación: $${formatCurrency(b.vehicle.valuation)}</span>
          </div>
        </div>

        <!-- Breakdown Details -->
        <div class="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-600">Arancel DNRPA (${b.costs.dnrpaRate}%):</span>
            <span class="font-semibold text-slate-800">$${formatCurrency(b.costs.dnrpaAmt)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-600">Sellos DGR Corrientes (${b.costs.dgrRate}%):</span>
            <span class="font-semibold text-slate-800">$${formatCurrency(b.costs.dgrAmt)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-600">Formularios / Verificación F-12 / ACOR:</span>
            <span class="font-semibold text-slate-800">$${formatCurrency(b.costs.formsFixed + b.costs.f12Verif + b.costs.acorTax)}</span>
          </div>
          <div class="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded">
            <span>Subtotal Tasas & Registrales:</span>
            <span>$${formatCurrency(b.costs.subtotalRegistral)}</span>
          </div>
          <div class="flex justify-between py-1.5 font-bold text-blue-900 bg-blue-50 px-2 rounded">
            <span>Honorarios de Gestoría:</span>
            <span>$${formatCurrency(b.costs.honorariosTotal)}</span>
          </div>
          <div class="flex justify-between py-2 font-extrabold text-white bg-slate-900 px-3 rounded-xl mt-2">
            <span>TOTAL GENERAL:</span>
            <span class="text-emerald-400 text-sm">$${formatCurrency(b.costs.totalGeneral)}</span>
          </div>
        </div>

        <!-- Documents -->
        <div class="bg-white p-3 rounded-xl border border-slate-200">
          <h4 class="font-bold text-slate-800 text-[11px] mb-2 uppercase">Control Documental Registrado</h4>
          ${docRowsHtml}
        </div>
      `;

      actionsBar.innerHTML = `
        <button onclick="sendDatabaseWhatsApp('${b.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
          <i class="fa-brands fa-whatsapp"></i> Reenviar WhatsApp
        </button>
        <button onclick="closeQuickViewModal(); loadBudgetIntoForm('${b.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5">
          <i class="fa-solid fa-pen-to-square"></i> Cargar al Editor
        </button>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeQuickViewModal() {
      const modal = document.getElementById('quick-view-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function initChecklist(procedureKey) {
      const container = document.getElementById('document-checklist-container');
      container.innerHTML = '';
      currentDocStatus = {};

      const docs = PROCEDURE_DOCUMENTS[procedureKey] || PROCEDURE_DOCUMENTS.transferencia;

      docs.forEach(item => {
        currentDocStatus[item.id] = item.default ? 'recibido' : 'pendiente';

        const row = document.createElement('div');
        row.className = "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 transition hover:bg-slate-100/90 gap-2";
        row.innerHTML = `
          <span class="text-xs font-medium text-slate-700 leading-snug">${item.name}</span>
          <div class="grid grid-cols-3 sm:flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <button type="button" onclick="setDocState('${item.id}', 'recibido')" id="btn-doc-${item.id}-recibido" class="py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition ${currentDocStatus[item.id] === 'recibido' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
              <i class="fa-solid fa-check text-[10px]"></i> <span>Recibido</span>
            </button>
            <button type="button" onclick="setDocState('${item.id}', 'pendiente')" id="btn-doc-${item.id}-pendiente" class="py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition ${currentDocStatus[item.id] === 'pendiente' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
              <i class="fa-solid fa-clock text-[10px]"></i> <span>Pendiente</span>
            </button>
            <button type="button" onclick="setDocState('${item.id}', 'no_aplica')" id="btn-doc-${item.id}-no_aplica" class="py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition ${currentDocStatus[item.id] === 'no_aplica' ? 'bg-slate-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
              <span>N/A</span>
            </button>
          </div>
        `;
        container.appendChild(row);
      });

      updateDocBadge();
    }

    function setDocState(docId, state) {
      currentDocStatus[docId] = state;
      const states = ['recibido', 'pendiente', 'no_aplica'];
      states.forEach(s => {
        const btn = document.getElementById(`btn-doc-${docId}-${s}`);
        if (!btn) return;
        if (s === state) {
          if (s === 'recibido') btn.className = 'py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition bg-emerald-600 text-white shadow-xs';
          if (s === 'pendiente') btn.className = 'py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition bg-amber-500 text-white shadow-xs';
          if (s === 'no_aplica') btn.className = 'py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition bg-slate-600 text-white shadow-xs';
        } else {
          btn.className = 'py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition bg-white text-slate-600 border border-slate-200 hover:bg-slate-100';
        }
      });
      updateDocBadge();
      triggerFormUpdate();
    }

    function updateDocBadge() {
      const keys = Object.keys(currentDocStatus);
      const total = keys.filter(k => currentDocStatus[k] !== 'no_aplica').length;
      const recibidos = keys.filter(k => currentDocStatus[k] === 'recibido').length;
      const badge = document.getElementById('doc-progress-badge');
      if (!badge) return;
      badge.textContent = `${recibidos} de ${total} Entregados`;
      if (recibidos === total && total > 0) {
        badge.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
      } else {
        badge.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800";
      }
    }

    function onProcedureChange() {
      const procedure = document.getElementById('procedure-type').value;
      initChecklist(procedure);

      if (procedure === 'informe_dominio' || procedure === 'duplicado_cedula' || procedure === 'denuncia_venta') {
        document.getElementById('tax-dnrpa-rate').value = 0;
        document.getElementById('tax-dgr-rate').value = 0;
        document.getElementById('cost-f12-verif').value = 0;
        document.getElementById('cost-acor-tax').value = 0;
        if (procedure === 'informe_dominio') {
          document.getElementById('cost-forms-fixed').value = 14500;
          document.getElementById('honorario-base').value = 25000;
        } else if (procedure === 'denuncia_venta') {
          document.getElementById('cost-forms-fixed').value = 28000;
          document.getElementById('honorario-base').value = 45000;
        } else {
          document.getElementById('cost-forms-fixed').value = 22000;
          document.getElementById('honorario-base').value = 35000;
        }
      } else {
        const origin = document.getElementById('vehicle-origin').value;
        document.getElementById('tax-dnrpa-rate').value = origin === 'importado' ? 2.0 : 1.5;
        document.getElementById('tax-dgr-rate').value = 1.5;
        document.getElementById('cost-forms-fixed').value = 38500;
        document.getElementById('cost-f12-verif').value = 26000;
        document.getElementById('cost-acor-tax').value = 9500;
        document.getElementById('honorario-base').value = 75000;
      }

      triggerFormUpdate();
    }

    function onOriginChange() {
      const origin = document.getElementById('vehicle-origin').value;
      const proc = document.getElementById('procedure-type').value;
      if (proc === 'transferencia' || proc === 'inscripcion_inicial') {
        if (origin === 'importado') {
          document.getElementById('tax-dnrpa-rate').value = 2.0;
        } else if (origin === 'nacional') {
          document.getElementById('tax-dnrpa-rate').value = 1.5;
        } else {
          document.getElementById('tax-dnrpa-rate').value = 1.0;
        }
      }
      triggerFormUpdate();
    }

    function resetTariffsToDefault() {
      document.getElementById('tax-dnrpa-rate').value = 1.5;
      document.getElementById('tax-dgr-rate').value = 1.5;
      document.getElementById('cost-forms-fixed').value = 38500;
      document.getElementById('cost-f12-verif').value = 26000;
      document.getElementById('cost-acor-tax').value = 9500;
      document.getElementById('honorario-base').value = 75000;
      document.getElementById('honorario-complexity').value = "1.0";
      showToast("Valores restablecidos por defecto.", "info");
      triggerFormUpdate();
    }

    function recalcAndRender() {
      const clientName = document.getElementById('client-name').value || "Cliente";
      const clientDni = document.getElementById('client-dni').value || "-";
      const clientPhone = document.getElementById('client-phone').value || "-";
      const clientCity = document.getElementById('client-city').value;
      const clientProvince = document.getElementById('client-province').value;
      const clientSeccional = document.getElementById('client-seccional').value || "-";

      const vehicleDominio = (document.getElementById('vehicle-dominio').value || "SIN DOM").toUpperCase();
      const vehicleModel = document.getElementById('vehicle-model').value || "Vehículo sin especificar";
      const vehicleYear = document.getElementById('vehicle-year').value;
      const vehicleType = document.getElementById('vehicle-type').value;
      const vehicleOrigin = document.getElementById('vehicle-origin').value;
      const vehicleValuation = parseFloat(document.getElementById('vehicle-valuation').value) || 0;

      const procedureKey = document.getElementById('procedure-type').value;
      const procedureText = document.getElementById('procedure-type').selectedOptions[0].text;

      const dnrpaRate = parseFloat(document.getElementById('tax-dnrpa-rate').value) || 0;
      const dgrRate = parseFloat(document.getElementById('tax-dgr-rate').value) || 0;

      const costFormsFixed = parseFloat(document.getElementById('cost-forms-fixed').value) || 0;
      const costF12 = parseFloat(document.getElementById('cost-f12-verif').value) || 0;
      const costAcor = parseFloat(document.getElementById('cost-acor-tax').value) || 0;

      const honorarioBase = parseFloat(document.getElementById('honorario-base').value) || 0;
      const complexityFactor = parseFloat(document.getElementById('honorario-complexity').value) || 1.0;

      const dnrpaAmt = Math.round(vehicleValuation * (dnrpaRate / 100));
      const dgrAmt = Math.round(vehicleValuation * (dgrRate / 100));

      const subtotalRegistral = Math.max(0, dnrpaAmt + dgrAmt + costFormsFixed + costF12 + costAcor);
      const honorariosTotal = Math.max(0, Math.round(honorarioBase * complexityFactor));
      const totalGeneral = subtotalRegistral + honorariosTotal;

      const anticipoType = document.getElementById('anticipo-type').value;
      let anticipoAmt = 0;
      let anticipoLabel = "";
      if (anticipoType === 'gastos') {
        anticipoAmt = subtotalRegistral;
        anticipoLabel = `Anticipo 100% Gastos: $${formatCurrency(anticipoAmt)}`;
      } else if (anticipoType === '50percent') {
        anticipoAmt = Math.round(totalGeneral * 0.5);
        anticipoLabel = `Anticipo 50% Total: $${formatCurrency(anticipoAmt)}`;
      } else {
        anticipoAmt = Math.round(subtotalRegistral + (honorariosTotal * 0.5));
        anticipoLabel = `Anticipo Gastos + 50% Hon.: $${formatCurrency(anticipoAmt)}`;
      }

      document.getElementById('val-dnrpa-calculated').textContent = `$${formatCurrency(dnrpaAmt)}`;
      document.getElementById('val-dgr-calculated').textContent = `$${formatCurrency(dgrAmt)}`;
      document.getElementById('val-anticipo').textContent = `$${formatCurrency(anticipoAmt)}`;

      document.getElementById('kpi-subtotal-registral').textContent = `$${formatCurrency(subtotalRegistral)}`;
      document.getElementById('kpi-dgr-corrientes').textContent = `$${formatCurrency(dgrAmt)}`;
      document.getElementById('kpi-honorarios').textContent = `$${formatCurrency(honorariosTotal)}`;
      document.getElementById('kpi-total-general').textContent = `$${formatCurrency(totalGeneral)}`;

      const mobileTotalEl = document.getElementById('mobile-bottom-total');
      if (mobileTotalEl) {
        mobileTotalEl.textContent = `$${formatCurrency(totalGeneral)}`;
      }

      document.getElementById('preview-company-name').textContent = GESTOR_CONFIG.studioName;
      document.getElementById('preview-mandatario-info').textContent = `${GESTOR_CONFIG.gestorName} • ${GESTOR_CONFIG.matricula}`;
      document.getElementById('preview-phone').textContent = GESTOR_CONFIG.phone;

      document.getElementById('preview-budget-id').textContent = `#${activeBudgetId}`;
      const now = new Date();
      document.getElementById('preview-date').textContent = now.toLocaleDateString('es-AR');

      document.getElementById('preview-client').textContent = clientName;
      document.getElementById('preview-dni').textContent = `DNI/CUIT: ${clientDni}`;
      document.getElementById('preview-loc').textContent =
        `Rad: ${[clientCity, clientProvince].filter(Boolean).join(', ')} • Secc: ${clientSeccional}`;

      document.getElementById('preview-veh').textContent =
        `${vehicleModel}${vehicleYear ? ` (${vehicleYear})` : ''}${vehicleType ? ` • ${vehicleType}` : ''}`;
      document.getElementById('preview-patente').textContent = vehicleDominio;
      document.getElementById('preview-val-str').textContent = `Valuación DNRPA: $${formatCurrency(vehicleValuation)}`;

      document.getElementById('preview-tramite-name').textContent = procedureText;
      document.getElementById('preview-origin-badge').textContent = `${vehicleOrigin.toUpperCase()} (${dnrpaRate}%)`;

      document.getElementById('prev-dnrpa-rate').textContent = dnrpaRate.toFixed(1);
      document.getElementById('prev-dnrpa-amt').textContent = `$${formatCurrency(dnrpaAmt)}`;

      document.getElementById('prev-dgr-rate').textContent = dgrRate.toFixed(1);
      document.getElementById('prev-dgr-amt').textContent = `$${formatCurrency(dgrAmt)}`;

      document.getElementById('prev-forms-amt').textContent = `$${formatCurrency(costFormsFixed)}`;
      document.getElementById('prev-verif-amt').textContent = `$${formatCurrency(costF12)}`;
      document.getElementById('prev-acor-amt').textContent = `$${formatCurrency(costAcor)}`;

      document.getElementById('prev-subtotal-registral').textContent = `$${formatCurrency(subtotalRegistral)}`;
      document.getElementById('prev-honorarios-amt').textContent = `$${formatCurrency(honorariosTotal)}`;
      document.getElementById('prev-total-general').textContent = `$${formatCurrency(totalGeneral)}`;
      document.getElementById('prev-anticipo-label').textContent = anticipoLabel;

      const previewDocSummary = document.getElementById('preview-doc-summary');
      previewDocSummary.innerHTML = '';
      const docs = PROCEDURE_DOCUMENTS[procedureKey] || PROCEDURE_DOCUMENTS.transferencia;

      let pendings = [];
      docs.forEach(doc => {
        const state = currentDocStatus[doc.id] || 'pendiente';
        if (state === 'pendiente') {
          pendings.push(doc.name);
        }
      });

      if (pendings.length > 0) {
        const pItem = document.createElement('div');
        pItem.className = 'text-amber-700 font-medium';
        pItem.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Faltan entregar: ${pendings.slice(0, 3).join(', ')}${pendings.length > 3 ? '...' : ''}`;
        previewDocSummary.appendChild(pItem);
      } else {
        const pItem = document.createElement('div');
        pItem.className = 'text-emerald-700 font-medium';
        pItem.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> Toda la documentación inicial se encuentra entregada.`;
        previewDocSummary.appendChild(pItem);
      }

      applyDocConfigToVoucher();

      return {
        clientName, clientDni, clientPhone, clientCity, clientProvince, clientSeccional,
        vehicleDominio, vehicleModel, vehicleYear, vehicleType, vehicleOrigin, vehicleValuation,
        procedureKey, procedureText,
        dnrpaRate, dgrRate, dnrpaAmt, dgrAmt, costFormsFixed, costF12, costAcor,
        subtotalRegistral, honorarioBase, complexityFactor, honorariosTotal,
        totalGeneral, anticipoAmt, anticipoLabel
      };
    }

    function openDocExportModal(defaultAction = 'pdf') {
      const modal = document.getElementById('doc-export-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      document.getElementById('cfg-doc-paper-size').value = docExportConfig.paperSize;
      document.getElementById('cfg-doc-orientation').value = docExportConfig.orientation;
      document.getElementById('cfg-doc-show-header').checked = docExportConfig.showHeader;
      document.getElementById('cfg-doc-show-breakdown').checked = docExportConfig.showBreakdown;
      document.getElementById('cfg-doc-show-fees').checked = docExportConfig.showFees;
      document.getElementById('cfg-doc-show-docs').checked = docExportConfig.showDocs;
      document.getElementById('cfg-doc-show-anticipo').checked = docExportConfig.showAnticipo;
      document.getElementById('cfg-doc-validity-days').value = docExportConfig.validityDays;
      document.getElementById('cfg-doc-custom-notes').value = docExportConfig.customNotes;
      document.getElementById('cfg-doc-autosave').checked = docExportConfig.autoSave;

      updateDocExportPreview();
    }

    function closeDocExportModal() {
      const modal = document.getElementById('doc-export-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function updateDocExportPreview() {
      docExportConfig.paperSize = document.getElementById('cfg-doc-paper-size').value;
      docExportConfig.orientation = document.getElementById('cfg-doc-orientation').value;
      docExportConfig.showHeader = document.getElementById('cfg-doc-show-header').checked;
      docExportConfig.showBreakdown = document.getElementById('cfg-doc-show-breakdown').checked;
      docExportConfig.showFees = document.getElementById('cfg-doc-show-fees').checked;
      docExportConfig.showDocs = document.getElementById('cfg-doc-show-docs').checked;
      docExportConfig.showAnticipo = document.getElementById('cfg-doc-show-anticipo').checked;
      docExportConfig.validityDays = document.getElementById('cfg-doc-validity-days').value;
      docExportConfig.customNotes = document.getElementById('cfg-doc-custom-notes').value.trim();
      docExportConfig.autoSave = document.getElementById('cfg-doc-autosave').checked;

      applyDocConfigToVoucher();
    }

    function applyDocConfigToVoucher() {
      const headerBox = document.getElementById('preview-header-box');
      if (headerBox) {
        headerBox.style.display = docExportConfig.showHeader ? 'flex' : 'none';
      }

      const rowsToToggle = ['row-prev-dnrpa', 'row-prev-dgr', 'row-prev-forms', 'row-prev-verif', 'row-prev-acor', 'row-prev-subtotal'];
      const unifiedRow = document.getElementById('row-prev-unified');
      const honorariosRow = document.getElementById('row-prev-honorarios');

      if (!docExportConfig.showBreakdown) {
        rowsToToggle.forEach(rId => {
          const el = document.getElementById(rId);
          if (el) el.classList.add('hidden');
        });
        if (honorariosRow) honorariosRow.classList.add('hidden');
        if (unifiedRow) {
          unifiedRow.classList.remove('hidden');
          unifiedRow.classList.add('flex');
          const totalVal = document.getElementById('prev-total-general').textContent;
          document.getElementById('prev-unified-amt').textContent = totalVal;
        }
      } else {
        rowsToToggle.forEach(rId => {
          const el = document.getElementById(rId);
          if (el) el.classList.remove('hidden');
        });
        if (unifiedRow) {
          unifiedRow.classList.add('hidden');
          unifiedRow.classList.remove('flex');
        }
        if (honorariosRow) {
          if (docExportConfig.showFees) {
            honorariosRow.classList.remove('hidden');
            honorariosRow.classList.add('flex');
          } else {
            honorariosRow.classList.add('hidden');
            honorariosRow.classList.remove('flex');
          }
        }
      }

      const anticipoLabel = document.getElementById('prev-anticipo-label');
      if (anticipoLabel) {
        anticipoLabel.style.display = docExportConfig.showAnticipo ? 'block' : 'none';
      }

      const docSummaryBox = document.getElementById('preview-doc-summary-box');
      if (docSummaryBox) {
        docSummaryBox.style.display = docExportConfig.showDocs ? 'block' : 'none';
      }

      const notesBox = document.getElementById('preview-custom-notes-box');
      const notesText = document.getElementById('preview-custom-notes-text');
      if (notesBox && notesText) {
        if (docExportConfig.customNotes.length > 0) {
          notesText.textContent = docExportConfig.customNotes;
          notesBox.classList.remove('hidden');
        } else {
          notesBox.classList.add('hidden');
        }
      }

      const disclaimer = document.getElementById('preview-legal-disclaimer');
      if (disclaimer) {
        disclaimer.textContent = `* Presupuesto válido por ${docExportConfig.validityDays} días hábiles. Los montos de aranceles y sellos provinciales (DGR) son calculados sobre las tablas vigentes de la DNRPA y pueden ajustarse si el organismo actualiza los valores antes del ingreso del trámite.`;
      }
    }

    function executeDocumentExport(targetAction) {
      updateDocExportPreview();

      // Always auto-save whenever user outputs or downloads
      saveCurrentBudget(true);

      closeDocExportModal();

      if (targetAction === 'print') {
        showToast("Abriendo diálogo de impresión...", "info");
        setTimeout(() => {
          window.print();
        }, 200);
      } else if (targetAction === 'pdf') {
        generatePDF();
      }
    }

    function generatePDF() {
      const element = document.getElementById('printable-budget');
      const data = recalcAndRender();
      showToast("Generando archivo PDF con tu configuración...", "info");

      const paperSize = docExportConfig.paperSize || 'a4';
      const orientation = docExportConfig.orientation || 'portrait';

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Presupuesto_${data.vehicleDominio}_${activeBudgetId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: paperSize, orientation: orientation }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        showToast("PDF descargado correctamente.", "success");
      }).catch(err => {
        console.error(err);
        showToast("Error al exportar PDF. Puede usar la opción de imprimir.", "error");
      });
    }

    let historyPage = 1;
    const HISTORY_PAGE_SIZE = 10;

    function renderHistoryTable() {
      const tbody = document.getElementById('history-table-body');
      const emptyState = document.getElementById('history-empty-state');
      const query = (document.getElementById('search-query')?.value || '').toLowerCase();
      const filterStatus = document.getElementById('filter-status')?.value || 'all';
      const filterProc = document.getElementById('filter-procedure')?.value || 'all';
      const dateFrom = document.getElementById('filter-date-from')?.value || '';
      const dateTo = document.getElementById('filter-date-to')?.value || '';

      if (!tbody) return;
      tbody.innerHTML = '';

      const filtered = budgetDatabase.filter(item => {
        const matchesQuery = (item.client?.name || '').toLowerCase().includes(query) ||
                             (item.vehicle?.dominio || '').toLowerCase().includes(query) ||
                             (item.client?.city || '').toLowerCase().includes(query) ||
                             (item.client?.province || '').toLowerCase().includes(query) ||
                             (item.id || '').toLowerCase().includes(query);
        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesProc = filterProc === 'all' || item.procedure === filterProc;
        const matchesFrom = !dateFrom || (item.date || '') >= dateFrom;
        const matchesTo = !dateTo || (item.date || '') <= dateTo;
        return matchesQuery && matchesStatus && matchesProc && matchesFrom && matchesTo;
      });

      if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        historyPage = 1;
        updateHistoryPagination(filtered.length);
        return;
      }
      if (emptyState) emptyState.classList.add('hidden');

      const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
      historyPage = Math.min(historyPage, totalPages);
      const pageItems = filtered.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

      pageItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";

        let statusColor = "bg-amber-100 text-amber-800";
        if (item.status === 'Aceptado') statusColor = "bg-blue-100 text-blue-800";
        if (item.status === 'Finalizado') statusColor = "bg-emerald-100 text-emerald-800";
        if (item.status === 'Cancelado') statusColor = "bg-rose-100 text-rose-800";

        tr.innerHTML = `
          <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
              <div>${escapeHtml(item.id)}</div>
            <div class="text-[10px] font-normal text-slate-400">${item.date}</div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
              <div class="font-semibold text-slate-800">${escapeHtml(item.client?.name)}</div>
              <div class="text-[11px] text-slate-500">${escapeHtml(item.client?.phone)} • ${escapeHtml([item.client?.city, item.client?.province].filter(Boolean).join(', '))}</div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
              <span class="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 border text-[11px]">${escapeHtml(item.vehicle?.dominio)}</span>
              <span class="text-slate-600 ml-1 truncate max-w-[150px] inline-block align-middle">${escapeHtml(item.vehicle?.model)}</span>
          </td>
          <td class="py-3 px-4 capitalize text-slate-600 whitespace-nowrap">
            ${item.procedure.replace('_', ' ')}
          </td>
          <td class="py-3 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
            $${formatCurrency(item.costs.totalGeneral)}
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <select onchange="updateBudgetStatus('${item.id}', this.value)" class="text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusColor} outline-none">
              <option value="Pendiente" ${item.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="Aceptado" ${item.status === 'Aceptado' ? 'selected' : ''}>Aceptado</option>
              <option value="Finalizado" ${item.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
              <option value="Cancelado" ${item.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="openQuickViewModal('${item.id}')" title="Ver Comprobante Completo" class="p-1.5 rounded hover:bg-slate-200 text-slate-700">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button onclick="loadBudgetIntoForm('${item.id}')" title="Cargar y Editar" class="p-1.5 rounded hover:bg-slate-200 text-brand-600">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="sendDatabaseWhatsApp('${item.id}')" title="Reenviar WhatsApp" class="p-1.5 rounded hover:bg-emerald-100 text-emerald-600">
                <i class="fa-brands fa-whatsapp"></i>
              </button>
              <button onclick="deleteBudget('${item.id}')" title="Eliminar Presupuesto" class="p-1.5 rounded hover:bg-rose-100 text-rose-600">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
      updateHistoryPagination(filtered.length);
    }

    function updateHistoryPagination(totalItems) {
      const totalPages = Math.max(1, Math.ceil(totalItems / HISTORY_PAGE_SIZE));
      const summary = document.getElementById('history-summary');
      const label = document.getElementById('history-page-label');
      const prev = document.getElementById('history-prev-page');
      const next = document.getElementById('history-next-page');
      if (summary) summary.textContent = totalItems === 0
        ? 'Sin resultados'
        : `${totalItems} presupuestos · $${formatCurrency(budgetDatabase.reduce((sum, item) => sum + (Number(item.costs?.totalGeneral) || 0), 0))} registrados`;
      if (label) label.textContent = `Página ${historyPage} de ${totalPages}`;
      if (prev) prev.disabled = historyPage <= 1;
      if (next) next.disabled = historyPage >= totalPages;
    }

    function changeHistoryPage(delta) {
      historyPage += delta;
      if (historyPage < 1) historyPage = 1;
      renderHistoryTable();
    }

    function csvCell(value) {
      const text = String(value ?? '');
      return `"${text.replaceAll('"', '""')}"`;
    }

    function exportDatabaseCSV() {
      const headers = ['ID', 'Fecha', 'Estado', 'Cliente', 'DNI_CUIT', 'Telefono', 'Localidad', 'Provincia', 'Tramite', 'Dominio', 'Modelo', 'Ano', 'Valuacion', 'Total'];
      const rows = budgetDatabase.map(item => [
        item.id,
        item.date,
        item.status,
        item.client?.name,
        item.client?.dni,
        item.client?.phone,
        item.client?.city,
        item.client?.province,
        item.procedure,
        item.vehicle?.dominio,
        item.vehicle?.model,
        item.vehicle?.year,
        item.vehicle?.valuation,
        item.costs?.totalGeneral
      ]);
      const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presupuestos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Historial exportado a CSV.', 'success');
    }

    async function updateBudgetStatus(id, newStatus) {
      const b = budgetDatabase.find(x => x.id === id);
      if (b) {
        b.status = newStatus;
        b.updatedAt = new Date().toISOString();
        persistBudgets();
        if (isCloudActive && db && currentUser) {
          try {
            const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'presupuestos', id);
            await setDoc(docRef, { status: newStatus, updatedAt: b.updatedAt }, { merge: true });
          } catch (e) {
            console.error(e);
          }
        }
        showToast(`Estado de #${id} actualizado a ${newStatus}`, "info");
        renderHistoryTable();
      }
    }

    async function deleteBudget(id) {
      if (!window.confirm(`¿Eliminar el presupuesto #${id}? Esta acción no se puede deshacer.`)) {
        return;
      }
      budgetDatabase = budgetDatabase.filter(b => b.id !== id);
      persistBudgets();
      if (isCloudActive && db && currentUser) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'presupuestos', id);
          await deleteDoc(docRef);
        } catch (e) {
          console.error(e);
        }
      }
      showToast(`Presupuesto #${id} eliminado.`, "info");
      updateBadgeCount();
      renderRecentBudgetsBar();
      renderHistoryTable();
    }

    let budgetFormLoadRequest = 0;

    async function loadBudgetIntoForm(id) {
      const b = budgetDatabase.find(x => x.id === id);
      if (!b) return;
      const requestId = ++budgetFormLoadRequest;

      activeBudgetId = b.id;
      document.getElementById('client-name').value = b.client.name;
      document.getElementById('client-dni').value = b.client.dni;
      document.getElementById('client-phone').value = b.client.phone;
      document.getElementById('client-email').value = b.client.email || '';
      const provinceSelect = document.getElementById('client-province');
      provinceSelect.value = b.client.province || '';
      await loadLocalities(provinceSelect.value, b.client.city || '');
      if (requestId !== budgetFormLoadRequest) return;
      await loadSeccionalOptions(
        provinceSelect.value,
        b.client.city || '',
        b.client.seccional || ''
      );
      if (requestId !== budgetFormLoadRequest) return;

      document.getElementById('procedure-type').value = b.procedure;
      initChecklist(b.procedure);

      if (b.checklist && b.checklist.length > 0) {
        b.checklist.forEach(item => {
          if (currentDocStatus.hasOwnProperty(item.id)) {
            setDocState(item.id, item.status);
          }
        });
      }

      document.getElementById('vehicle-dominio').value = b.vehicle.dominio;
      document.getElementById('vehicle-model').value = b.vehicle.model;
      document.getElementById('vehicle-year').value = b.vehicle.year;
      document.getElementById('vehicle-type').value = b.vehicle.type || '';
      document.getElementById('vehicle-origin').value = b.vehicle.origin;
      document.getElementById('vehicle-valuation').value = b.vehicle.valuation;

      document.getElementById('tax-dnrpa-rate').value = b.costs.dnrpaRate;
      document.getElementById('tax-dgr-rate').value = b.costs.dgrRate;
      document.getElementById('cost-forms-fixed').value = b.costs.formsFixed;
      document.getElementById('cost-f12-verif').value = b.costs.f12Verif;
      document.getElementById('cost-acor-tax').value = b.costs.acorTax;

      document.getElementById('honorario-base').value = b.costs.honorarioBase;
      document.getElementById('honorario-complexity').value = b.costs.complexityFactor.toString();

      document.getElementById('budget-status-pill').textContent = b.status;

      switchView('creator');
      recalcAndRender();
      renderRecentBudgetsBar();
      showToast(`Presupuesto #${id} cargado en el editor.`, "info");
    }

    function updateBadgeCount() {
      const badge = document.getElementById('budget-count-badge');
      if (badge) badge.textContent = budgetDatabase.length;
    }

    function buildWhatsAppText(data) {
      let pendingDocs = [];
      const docs = PROCEDURE_DOCUMENTS[data.procedureKey] || PROCEDURE_DOCUMENTS.transferencia;
      docs.forEach(d => {
        if (currentDocStatus[d.id] === 'pendiente') pendingDocs.push(d.name);
      });

      const message = `*PRESUPUESTO GESTORÍA AUTOMOTOR CORRIENTES*\n` +
        `Hola *${data.clientName}*, adjuntamos el detalle del presupuesto para su vehículo:\n\n` +
        `📋 *Trámite:* ${data.procedureText}\n` +
        `🚗 *Automotor:* ${data.vehicleModel}${data.vehicleYear ? ` (${data.vehicleYear})` : ''}\n` +
        `🏷️ *Tipo de vehículo:* ${data.vehicleType || '-'}\n` +
        `🔢 *Dominio:* ${data.vehicleDominio}\n` +
        `📍 *Localidad:* ${data.clientCity}\n` +
        `🗺️ *Provincia:* ${data.clientProvince || '-'}\n\n` +
        `*DESGLOSE DE GASTOS:*\n` +
        `• Arancel DNRPA (${data.dnrpaRate}%): $${formatCurrency(data.dnrpaAmt)}\n` +
        `• Sellos DGR Corrientes (${data.dgrRate}%): $${formatCurrency(data.dgrAmt)}\n` +
        `• Formularios oficiales (08/02): $${formatCurrency(data.costFormsFixed)}\n` +
        `• Verificación Policial F-12: $${formatCurrency(data.costF12)}\n` +
        `• Tasas Municipales / ACOR: $${formatCurrency(data.costAcor)}\n` +
        `-----------------------------\n` +
        `🏛️ *Subtotal Gastos Registrales:* $${formatCurrency(data.subtotalRegistral)}\n` +
        `💼 *Honorarios de Gestoría:* $${formatCurrency(data.honorariosTotal)}\n` +
        `-----------------------------\n` +
        `💰 *TOTAL GENERAL:* $${formatCurrency(data.totalGeneral)}\n` +
        `💳 *${data.anticipoLabel}*\n\n` +
        (pendingDocs.length > 0 ? `⚠️ *Documentación faltante:* \n- ${pendingDocs.join('\n- ')}\n\n` : `✅ *Documentación:* Completa.\n\n`) +
        `_Mandatario: ${GESTOR_CONFIG.gestorName} (${GESTOR_CONFIG.matricula})_\n` +
        `_Válido por 10 días hábiles. Sujeto a actualización de tabla DNRPA._`;

      return message;
    }

    function sendViaWhatsApp() {
      // Automatically save before sending
      saveCurrentBudget(true);

      const data = recalcAndRender();
      let phone = data.clientPhone.replace(/\D/g, '');
      if (!phone || phone.length < 6) {
        showToast("Por favor ingrese un número de teléfono válido.", "error");
        return;
      }
      if (!phone.startsWith('54')) {
        phone = '549' + phone;
      }

      const text = buildWhatsAppText(data);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      showToast("Abriendo WhatsApp y guardando presupuesto...", "success");
    }

    function sendDatabaseWhatsApp(id) {
      const b = budgetDatabase.find(x => x.id === id);
      if (!b) return;

      const data = {
        clientName: b.client.name,
        clientPhone: b.client.phone,
        clientCity: b.client.city,
        clientProvince: b.client.province || '',
        procedureText: b.procedure.replace('_', ' ').toUpperCase(),
        procedureKey: b.procedure,
        vehicleModel: b.vehicle.model,
        vehicleYear: b.vehicle.year,
        vehicleType: b.vehicle.type || '',
        vehicleDominio: b.vehicle.dominio,
        dnrpaRate: b.costs.dnrpaRate,
        dnrpaAmt: b.costs.dnrpaAmt,
        dgrRate: b.costs.dgrRate,
        dgrAmt: b.costs.dgrAmt,
        costFormsFixed: b.costs.formsFixed,
        costF12: b.costs.f12Verif,
        costAcor: b.costs.acorTax,
        subtotalRegistral: b.costs.subtotalRegistral,
        honorariosTotal: b.costs.honorariosTotal,
        totalGeneral: b.costs.totalGeneral,
        anticipoLabel: `Anticipo sugerido: $${formatCurrency(b.costs.anticipo)}`
      };

      let phone = data.clientPhone.replace(/\D/g, '');
      if (!phone.startsWith('54')) phone = '549' + phone;

      const text = buildWhatsAppText(data);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    }

    function sendViaEmail() {
      saveCurrentBudget(true);
      const data = recalcAndRender();
      const email = document.getElementById('client-email').value;
      const subject = `Presupuesto de Gestoría #${activeBudgetId} - ${data.vehicleDominio} - ${GESTOR_CONFIG.studioName}`;
      const body = buildWhatsAppText(data).replace(/\*/g, '');
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    }

    async function copyFormattedText() {
      saveCurrentBudget(true);
      const data = recalcAndRender();
      const text = buildWhatsAppText(data);
      try {
        await navigator.clipboard.writeText(text);
        showToast("Texto copiado al portapapeles y guardado.", "success");
      } catch (error) {
        showToast("No se pudo acceder al portapapeles.", "error");
      }
    }

    function switchView(viewName) {
      const creatorView = document.getElementById('view-creator');
      const historyView = document.getElementById('view-history');
      const btnCreator = document.getElementById('nav-btn-creator');
      const btnHistory = document.getElementById('nav-btn-history');

      if (viewName === 'creator') {
        creatorView.classList.remove('hidden');
        historyView.classList.add('hidden');
        btnCreator.className = "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 transition shadow-sm flex items-center gap-1.5";
        btnHistory.className = "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center gap-1.5";
      } else {
        creatorView.classList.add('hidden');
        historyView.classList.remove('hidden');
        btnHistory.className = "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 transition shadow-sm flex items-center gap-1.5";
        btnCreator.className = "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center gap-1.5";
        renderHistoryTable();
      }
    }

    function exportDatabaseJSON() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(budgetDatabase, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `presupuestos_gestoria_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Copia de seguridad descargada en JSON.", "success");
    }

    function openConfigModal() {
      document.getElementById('cfg-studio-name').value = GESTOR_CONFIG.studioName;
      document.getElementById('cfg-gestor-name').value = GESTOR_CONFIG.gestorName;
      document.getElementById('cfg-gestor-matr').value = GESTOR_CONFIG.matricula;
      document.getElementById('cfg-gestor-phone').value = GESTOR_CONFIG.phone;
      document.getElementById('cfg-gestor-email').value = GESTOR_CONFIG.email;
      document.getElementById('cfg-gestor-address').value = GESTOR_CONFIG.address;
      document.getElementById('config-modal').classList.remove('hidden');
      document.getElementById('config-modal').classList.add('flex');
    }

    function closeConfigModal() {
      document.getElementById('config-modal').classList.add('hidden');
      document.getElementById('config-modal').classList.remove('flex');
    }

    function saveConfigSettings() {
      GESTOR_CONFIG.studioName = document.getElementById('cfg-studio-name').value;
      GESTOR_CONFIG.gestorName = document.getElementById('cfg-gestor-name').value;
      GESTOR_CONFIG.matricula = document.getElementById('cfg-gestor-matr').value;
      GESTOR_CONFIG.phone = document.getElementById('cfg-gestor-phone').value;
      GESTOR_CONFIG.email = document.getElementById('cfg-gestor-email').value;
      GESTOR_CONFIG.address = document.getElementById('cfg-gestor-address').value;
      persistConfig();

      closeConfigModal();
      recalcAndRender();
      showToast("Configuración del mandatario actualizada.", "success");
    }

    function formatCurrency(number) {
      if (isNaN(number)) return "0";
      return new Intl.NumberFormat('es-AR').format(number);
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');

      let bg = 'bg-slate-900 text-white';
      let icon = 'fa-circle-info text-blue-400';
      if (type === 'success') {
        bg = 'bg-emerald-900 text-white border border-emerald-700';
        icon = 'fa-circle-check text-emerald-400';
      } else if (type === 'error') {
        bg = 'bg-rose-900 text-white border border-rose-700';
        icon = 'fa-circle-exclamation text-rose-400';
      }

      toast.className = `${bg} pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0`;
      toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${message}</span>`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    window.switchView = switchView;
    window.initChecklist = initChecklist;
    window.setDocState = setDocState;
    window.onProcedureChange = onProcedureChange;
    window.onOriginChange = onOriginChange;
    window.onProvinceChange = onProvinceChange;
    window.onLocalityChange = onLocalityChange;
    window.resetTariffsToDefault = resetTariffsToDefault;
    window.recalcAndRender = recalcAndRender;
    window.triggerFormUpdate = triggerFormUpdate;
    window.openDocExportModal = openDocExportModal;
    window.closeDocExportModal = closeDocExportModal;
    window.updateDocExportPreview = updateDocExportPreview;
    window.executeDocumentExport = executeDocumentExport;
    window.saveCurrentBudget = saveCurrentBudget;
    window.manualSaveCurrentBudget = manualSaveCurrentBudget;
    window.createNewBudgetDraft = createNewBudgetDraft;
    window.renderHistoryTable = renderHistoryTable;
    window.renderRecentBudgetsBar = renderRecentBudgetsBar;
    window.openQuickViewModal = openQuickViewModal;
    window.closeQuickViewModal = closeQuickViewModal;
    window.updateBudgetStatus = updateBudgetStatus;
    window.deleteBudget = deleteBudget;
    window.loadBudgetIntoForm = loadBudgetIntoForm;
    window.sendViaWhatsApp = sendViaWhatsApp;
    window.sendDatabaseWhatsApp = sendDatabaseWhatsApp;
    window.sendViaEmail = sendViaEmail;
    window.copyFormattedText = copyFormattedText;
    window.openConfigModal = openConfigModal;
    window.closeConfigModal = closeConfigModal;
    window.saveConfigSettings = saveConfigSettings;
    window.exportDatabaseJSON = exportDatabaseJSON;
    window.exportDatabaseCSV = exportDatabaseCSV;
    window.changeHistoryPage = changeHistoryPage;

    // PWA Trigger Support
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const pwaBox = document.getElementById('pwa-native-install-box');
      if (pwaBox) pwaBox.classList.remove('hidden');
    });

    window.triggerPwaPrompt = function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast("Instalando aplicación en tu dispositivo...", "success");
          }
          deferredPrompt = null;
          closeInstallModal();
        });
      }
    };

    window.openInstallModal = function() {
      const modal = document.getElementById('install-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    };

    window.closeInstallModal = function() {
      const modal = document.getElementById('install-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };

    function showLoginScreen() {
      document.getElementById('login-screen').classList.remove('hidden');
      document.getElementById('login-screen').classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }

    function hideLoginScreen() {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }

    window.toggleLoginPassword = function() {
      const password = document.getElementById('login-password');
      const icon = document.getElementById('login-password-icon');
      const reveal = password.type === 'password';
      password.type = reveal ? 'text' : 'password';
      icon.className = reveal ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    };

    window.logoutSession = async function() {
      try {
        if (auth) await signOut(auth);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showToast('No se pudo cerrar la sesión.', 'error');
      }
      showLoginScreen();
    };

    function getLoginErrorMessage(error) {
      const code = error?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Correo o contraseña incorrectos.';
      if (code === 'auth/user-not-found') return 'No existe una cuenta con ese correo.';
      if (code === 'auth/invalid-email') return 'Ingresá un correo electrónico válido.';
      if (code === 'auth/too-many-requests') return 'Demasiados intentos. Probá nuevamente más tarde.';
      if (code === 'auth/network-request-failed') return 'No hay conexión con el servicio de autenticación.';
      return 'No se pudo iniciar sesión. Revisá los datos ingresados.';
    }

    async function resetPassword() {
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const error = document.getElementById('login-error');
      if (!email) {
        error.textContent = 'Ingresá tu correo para recuperar la contraseña.';
        error.classList.remove('hidden');
        document.getElementById('login-email').focus();
        return;
      }
      if (!auth) {
        error.textContent = 'La recuperación requiere configurar Firebase Authentication.';
        error.classList.remove('hidden');
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        error.classList.add('hidden');
        showToast('Correo de recuperación enviado.', 'success');
      } catch (resetError) {
        error.textContent = getLoginErrorMessage(resetError);
        error.classList.remove('hidden');
      }
    }
    window.resetPassword = resetPassword;

    function setupAuthLogin() {
      showLoginScreen();
      const form = document.getElementById('login-form');
      form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const error = document.getElementById('login-error');
        const submitButton = form.querySelector('button[type="submit"]');

        if (!auth) {
          error.textContent = 'Autenticación no configurada. Agregá el proyecto Firebase antes de iniciar sesión.';
          error.classList.remove('hidden');
          return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Iniciando sesión...';
        try {
          await signInWithEmailAndPassword(auth, email, password);
          error.classList.add('hidden');
          showToast('Sesión iniciada correctamente.', 'success');
        } catch (loginError) {
          error.textContent = getLoginErrorMessage(loginError);
          error.classList.remove('hidden');
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = 'Iniciar sesión';
        }
      });
    }

    function uppercaseTextField(event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
      if (field.id === 'login-password' || event.isComposing) return;
      if (field instanceof HTMLInputElement &&
          !['text', 'email', 'tel', 'search'].includes(field.type)) return;

      const value = field.value;
      const start = field.selectionStart;
      const end = field.selectionEnd;
      const uppercaseValue = value.toUpperCase();
      if (value === uppercaseValue) return;

      field.value = uppercaseValue;
      if (start !== null && end !== null && field.type !== 'email') {
        field.setSelectionRange(
          value.slice(0, start).toUpperCase().length,
          value.slice(0, end).toUpperCase().length
        );
      }
    }

    document.addEventListener('input', uppercaseTextField, true);
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="search"], textarea')
      .forEach(field => {
        field.value = field.value.toUpperCase();
      });

    // Initialize application on window load
    window.onload = function() {
      loadStoredAppData();
      populateVehicleYearOptions();
      setupAuthLogin();
      initChecklist("transferencia");
      loadLocalities(
        document.getElementById('client-province').value,
        document.getElementById('client-city').value
      ).then(() => loadSeccionalOptions(
        document.getElementById('client-province').value,
        document.getElementById('client-city').value,
        document.getElementById('client-seccional').value
      ));
      recalcAndRender();
      initCloudSync();
      renderRecentBudgetsBar();
      renderHistoryTable();
      updateBadgeCount();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(error => {
          console.warn('No se pudo instalar el Service Worker:', error);
        });
      }
    };
