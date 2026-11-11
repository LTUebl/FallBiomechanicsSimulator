# Interactive Multi-Body Dynamics (MBD) Human Fall, Impact Kinetics & Skeletal Fracture Simulator

**LTU Experimental Biomechanics Laboratory (EBL) · MSU Forensic Anthropology**  
**LTU EBL Main Portal:** [https://ltuebl.github.io/](https://ltuebl.github.io/)  
**Live Interactive Simulator:** [https://ltuebl.github.io/FallBiomechanicsSimulator/](https://ltuebl.github.io/FallBiomechanicsSimulator/)

## Overview
An interactive, browser-based **Multi-Body Dynamics (MBD)** and **Forensic Biomechanics** simulation platform designed to model human falls across configurable height ranges (.5\text{ to }35.0\text{ m}$), predict landing orientations, quantify Ground Reaction Forces (GRF) and axial skeletal stress wave conduction, and evaluate regional fracture probabilities across varying tissue degeneration profiles.

### Sequential 4-Step Workflow
1. **Step 1 · Scenario & Parameter Setup:** Configure fall height, launch pitch angle ($\theta_0$), initial linear velocity ({x0}, v_{y0}$), angular tumbling velocity ($\omega_0$), subject mass and stature (scaled via Dempster 1955 and Winter 2009 anthropometrics), neuromuscular bracing tone, landing surface viscoelastic stiffness/damping, and bone mineral density / aging tissue tolerance ($\tau \in [0.40, 1.30]$). Includes a live 2D ballistic and posture preview canvas.
2. **Step 2 · Dynamic Fall Simulation & Video Export:** High-frequency sub-stepped (\text{ Hz}$) articulated 10-node / 9-segment MBD solver with non-linear Hunt-Crossley viscoelastic ground contact mechanics. Features slow-motion playback, millisecond chronology scrubbing, instantaneous bone stress color-mapping, GRF vector arrows, and built-in **WebM Video Export** (MediaRecorder API with embedded telemetry HUD).
3. **Step 3 · Trauma Map & GRF Analysis:** Interactive anatomical skeleton heat-map, forensic differential diagnosis summary (Hat Brim Line assessment, basilar ring fracture mechanics, and deceleration pulse analysis), segmental fracture diagnostic cards, and synchronized Chart.js plots for normal/tangential GRF, segmental load vs. tolerance, head acceleration ($\text{HIC}_{15}$), and system energy partitioning.
4. **Step 4 · Multi-Height Bimodal Explorer (1–30 m Sweep):** Automated 30-height parametric sweep demonstrating the biomechanical origin of the **bimodal cranial trauma distribution** and the transition across the three fall energy regimes: **Local Energy Dissipation** ($\le 3\text{ m}$), **Axial Conduction** (.1\text{--}12\text{ m}$), and **Systemic Composite Injury** ($> 12\text{ m}$).

---

## Detailed Reference List
- **Adamec, J., Jelen, K., Kubový, P., Lopot, F., & Schuller, E. (2010).** Forensic biomechanical analysis of falls from height using numerical human body models. *Journal of Forensic Sciences*, 55(6), 1615–1623. https://doi.org/10.1111/j.1556-4029.2010.01445.x
- **Atanasijevic, T. C., Savic, S. V., Nikolic, S. D., & Djokic, V. M. (2005).** Frequency and severity of injuries in correlation with the height of fall. *Journal of Forensic Sciences*, 50(3), 608–612. https://doi.org/10.1520/JFS2004124
- **Blandino, A., Zanaboni, A. M., Malchiodi, D., Di Francesco, C. V., Spada, C., Faraone, C., Travaini, G. V., & Casali, M. B. (2024).** Fatal fall from a height: Is it possible to apply artificial intelligence techniques for height estimation? *International Journal of Legal Medicine*, 138(5), 1845–1856. https://doi.org/10.1007/s00414-024-03371-4
- **Burstein, A. H., Reilly, D. T., & Martens, M. (1976).** Aging of bone tissue: Mechanical properties. *The Journal of Bone and Joint Surgery (American Volume)*, 58(1), 82–86.
- **Cormier, J. M., Manoogian, S. J., Bisplinghoff, J. A., Rowson, S., Santago, A. C., McNally, C., Duma, S. M., & Bolte, J. H. (2011).** The tolerance of the human head to blunt impact: Development of a revised skull fracture criterion. *Stapp Car Crash Journal*, 55, 377–418. https://doi.org/10.4271/2011-22-0016
- **Cross, R. (2008).** Trajectories of falling people. *European Journal of Physics*, 29(4), 675–684. https://doi.org/10.1088/0143-0807/29/4/002
- **Dempster, W. T. (1955).** Space requirements of the seated operator: Geometrical, kinematic, and mechanical aspects of the body with special reference to the limbs. *WADC Technical Report*, 55-159.
- **Henriques, M., Saliba-Serre, B., Martrille, L., Blum, A., Chaumoître, K., Donato, P., Campos, N., Cunha, E., & Adalian, P. (2023).** Discrimination between falls and blows from the localization and the number of fractures on computed tomography scans of the skull and the trunk. *Forensic Sciences Research*, 8(1), 30–40. https://doi.org/10.1093/fsr/owad006
- **Hunt, K. H., & Crossley, F. R. E. (1975).** Coefficient of restitution interpreted as damping in vibroimpact. *Journal of Applied Mechanics*, 42(2), 440–445. https://doi.org/10.1115/1.3423596
- **Kremer, C., Racette, S., Dionne, C., & Sauvageau, A. (2008).** Discrimination of falls and blows in blunt head trauma: Systematic study of the hat brim line rule in relation to skull fractures. *Journal of Forensic Sciences*, 53(3), 716–719. https://doi.org/10.1111/j.1556-4029.2008.00725.x
- **McCalden, R. W., McGeough, J. A., Barker, M. B., & Court-Brown, C. M. (1993).** Age-related changes in the tensile properties of cortical bone: The relative importance of changes in porosity, mineralization, and microstructure. *The Journal of Bone and Joint Surgery (American Volume)*, 75(8), 1193–1205.
- **Park, S., Cha, J. G., Lee, Y., Seo, I., Lee, B., Choi, Y., Choi, W., & Yang, K. (2015).** Biomechanical analysis of biphasic distribution of skull injury in falls from height. *Forensic Science International*, 253, 60–66. https://doi.org/10.1016/j.forsciint.2015.06.009
- **Winter, D. A. (2009).** *Biomechanics and Motor Control of Human Movement* (4th ed.). John Wiley & Sons. https://doi.org/10.1002/9780470549148
- **Woliński, F., Sado, J., Kraśnik, K., Sagan, J., Bryliński, Ł., Brylińska, K., Teresiński, G., Cywka, T., Prządka, M., Karpiński, R., & Baj, J. (2025).** Fatal free falls: A clinical and forensic analysis of skeletal injury patterns using PMCT and autopsy. *Journal of Clinical Medicine*, 14(22), 7912. https://doi.org/10.3390/jcm14227912
- **Yoganandan, N., Baisden, J. L., Lu, Y., Stemper, B. D., & Pintar, F. A. (2015).** Biomechanics of lumbar and thoracolumbar spine burst fractures under vertical dynamic loading. *Journal of Orthopaedic Research*, 33(10), 1438–1446. https://doi.org/10.1002/jor.22923
