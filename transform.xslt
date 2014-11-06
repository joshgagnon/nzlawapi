<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>

    <xsl:template match="/">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="prov">
        <div class="prov">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <h5 class="prov labelled">
                <span class="label">
                    <xsl:value-of select="label"/>
                </span>
                <span class="spc"/>
                <xsl:value-of select="heading"/>
            </h5>
            <ul class="prov">
                <li>
                    <xsl:apply-templates select="prov.body/subprov"/>
                     <xsl:apply-templates select="../../notes/history/history-note"/>
                </li>
            </ul>
        </div>
    </xsl:template>

    <xsl:template match='prov.body/subprov'>

        <div class="subprov">
            <xsl:apply-templates select="label"/>
            <xsl:apply-templates select="para/label-para"/>
        </div>
       

    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
            <li>

                <xsl:apply-templates select="label"/>

                <xsl:apply-templates select="para/label-para"/>

            </li>
        </ul>
    </xsl:template>

    <xsl:template match="label">
        <p class="labelled label">
            <span class="label">
                (
                <xsl:value-of select="."/>
                )
            </span>
            <span class="spc"></span>
            <xsl:value-of select="../para/text"/>
        </p>
    </xsl:template>

    <xsl:template match="notes/history/history-note">
        <p class="history-note">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:value-of select="."/>
        </p>
    </xsl:template>

</xsl:stylesheet>