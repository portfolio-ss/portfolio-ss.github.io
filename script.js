/* ============================================
   Portfolio Thai — Dynamic Projects Loader
   ============================================ */

(function () {
    'use strict';

    // --- Nav scroll effect ---
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    // --- Mobile menu toggle ---
    const menuBtn = document.querySelector('.nav-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            menuBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                menuBtn.textContent = '☰';
            });
        });
    }

    // --- Modal with Gallery & Sub-projects ---
    let currentGallery = null; // { images: [], index: 0, imgEl, dotsEl }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'project-modal';
        overlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" aria-label="Fechar">✕</button>
                <div id="modal-inner"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close events
        overlay.querySelector('.modal-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        return overlay;
    }

    function openModal(project) {
        const modal = document.getElementById('project-modal') || createModal();
        const inner = modal.querySelector('#modal-inner');

        // Check if project has sub-projects
        if (project.projects && project.projects.length > 0) {
            renderSubprojectsModal(inner, project);
        } else {
            renderSimpleModal(inner, project);
        }

        // Show
        requestAnimationFrame(() => {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        });
    }

    function renderSimpleModal(container, project) {
        // Build images
        let images = [];
        if (project.images && Array.isArray(project.images)) {
            images = project.images;
        } else if (project.image && typeof project.image === 'string') {
            images = [project.image];
        }

        const categoryHTML = project.category
            ? `<span class="project-category">${escapeHTML(project.category)}</span>`
            : '';

        const tagsHTML = project.tags && project.tags.length > 0
            ? `<div class="project-tags">${project.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>`
            : '';

        const galleryId = 'main-gallery';
        container.innerHTML = `
            ${images.length > 0 ? buildGalleryHTML(images, galleryId) : ''}
            <div class="modal-body">
                ${categoryHTML}
                <h2>${escapeHTML(project.title)}</h2>
                <p>${escapeHTML(project.description)}</p>
                ${tagsHTML}
            </div>
        `;

        if (images.length > 0) {
            initGallery(container, galleryId, images);
        }
    }

    function renderSubprojectsModal(container, project) {
        // Use first image of first sub-project or project.image as cover
        const coverImage = project.image || (project.projects[0]?.images?.[0]) || '';

        let html = '';
        if (coverImage) {
            html += `<img class="modal-cover-image" src="${escapeHTML(coverImage)}" alt="${escapeHTML(project.title)}" />`;
        }

        html += `
            <div class="modal-body">
                <h2>${escapeHTML(project.title)}</h2>
                <p>${escapeHTML(project.description)}</p>
                <div class="subprojects-list">
        `;

        project.projects.forEach((sub, idx) => {
            const subImages = sub.images || (sub.image ? [sub.image] : []);
            const galleryId = `sub-gallery-${idx}`;
            html += `
                <div class="subproject-item">
                    <h3 class="subproject-title">${escapeHTML(sub.title)}</h3>
                    ${subImages.length > 0 ? buildGalleryHTML(subImages, galleryId) : ''}
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;

        // Init all sub-galleries
        project.projects.forEach((sub, idx) => {
            const subImages = sub.images || (sub.image ? [sub.image] : []);
            if (subImages.length > 0) {
                initGallery(container, `sub-gallery-${idx}`, subImages);
            }
        });
    }

    function buildGalleryHTML(images, galleryId) {
        const hasMultiple = images.length > 1;
        return `
            <div class="modal-gallery" data-gallery-id="${galleryId}">
                <img class="modal-image" src="${escapeHTML(images[0])}" alt="" />
                ${hasMultiple ? `
                    <button class="gallery-btn gallery-prev" aria-label="Anterior">‹</button>
                    <button class="gallery-btn gallery-next" aria-label="Próximo">›</button>
                    <div class="gallery-dots">
                        ${images.map((_, i) => `<span class="gallery-dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function initGallery(container, galleryId, images) {
        const galleryEl = container.querySelector(`[data-gallery-id="${galleryId}"]`);
        if (!galleryEl || images.length <= 1) return;

        let index = 0;
        const img = galleryEl.querySelector('.modal-image');
        const dots = galleryEl.querySelectorAll('.gallery-dot');

        function navigate(dir) {
            index = (index + dir + images.length) % images.length;
            img.src = images[index];
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }

        galleryEl.querySelector('.gallery-prev')?.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
        galleryEl.querySelector('.gallery-next')?.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                index = parseInt(dot.dataset.i);
                img.src = images[index];
                dots.forEach((d, i) => d.classList.toggle('active', i === index));
            });
        });
    }

    function closeModal() {
        const modal = document.getElementById('project-modal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // --- Load & Render Projects ---
    let allProjects = {};

    async function loadProjects() {
        try {
            const res = await fetch('projects.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            allProjects = data;

            renderSection('dev-projects', data.dev || [], true);
            renderSection('design-projects', data.design || [], false);

            createModal();
            initScrollReveal();
        } catch (err) {
            console.error('Erro ao carregar projetos:', err);
            document.querySelectorAll('.projects-grid').forEach(grid => {
                grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align:center;">Não foi possível carregar os projetos.</p>';
            });
        }
    }

    function renderSection(containerId, projects, isDev) {
        const container = document.getElementById(containerId);
        if (!container || projects.length === 0) return;

        container.innerHTML = projects.map((project, i) => {
            const imageHTML = project.image
                ? `<img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" loading="lazy">`
                : `<div class="no-image">🚀</div>`;

            const tagsHTML = isDev && project.tags
                ? `<div class="project-tags">${project.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>`
                : '';

            const categoryHTML = isDev && project.category
                ? `<span class="project-category">${escapeHTML(project.category)}</span>`
                : '';

            return `
                <div class="project-card ${isDev ? '' : 'design-card'} reveal"
                     style="--i:${i}"
                     data-section="${isDev ? 'dev' : 'design'}"
                     data-index="${i}">
                    <div class="project-card-image">
                        ${imageHTML}
                        <div class="overlay"></div>
                    </div>
                    <div class="project-card-body">
                        ${categoryHTML}
                        <h3>${escapeHTML(project.title)}</h3>
                        <p>${escapeHTML(project.description)}</p>
                        ${tagsHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const section = card.dataset.section;
                const index = parseInt(card.dataset.index);
                const project = allProjects[section]?.[index];
                if (project) openModal(project);
            });
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Scroll Reveal (Intersection Observer) ---
    function initScrollReveal() {
        const reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        reveals.forEach(el => observer.observe(el));
    }

    // --- Init ---
    document.addEventListener('DOMContentLoaded', () => {
        loadProjects();

        // Reveal static elements
        document.querySelectorAll('.section-header.reveal').forEach(el => {
            el.classList.add('reveal');
        });
        initScrollReveal();
    });
})();

