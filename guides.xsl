<?xml version="1.0" encoding="UTF-8"?>
<!-- Habillage du flux RSS : un navigateur affiche une page lisible aux couleurs du site,
     un lecteur RSS continue de lire le flux normalement. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/rss/channel">
    <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Flux des guides · Replere</title>
        <link rel="icon" href="img/favicon.png" type="image/png"/>
        <link rel="stylesheet" href="style.css?v=20261015a"/>
      </head>
      <body class="help">
        <header>
          <div class="wrap">
            <a class="logo" href="index.html"><img src="img/logo.png" alt="" width="34" height="34"/>Replere</a>
            <nav aria-label="Pages"><a href="index.html">Accueil</a><a href="pourquoi-replere.html">Pourquoi Replere</a><a href="guides.html" aria-current="page">Guides</a><a href="aide.html">Aide</a></nav>
          </div>
        </header>
        <main id="contenu">
          <div class="wrap">
            <p class="eyebrow">Flux RSS</p>
            <h1>Suivre les nouveaux guides</h1>
            <p class="lead">Cette page est un flux RSS. Copiez son adresse dans votre lecteur (Feedly, NetNewsWire, Reeder…) pour recevoir chaque nouveau guide.</p>
            <div class="card"><p style="margin:0"><strong>Adresse du flux :</strong> https://replere.app/guides.xml</p></div>
            <div class="guides">
              <xsl:for-each select="item">
                <a class="card guide-card" href="{link}">
                  <h3><xsl:value-of select="title"/></h3>
                  <p><xsl:value-of select="description"/></p>
                  <span class="more">Lire le guide →</span>
                </a>
              </xsl:for-each>
            </div>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
