
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space">,.;:)(</xsl:variable>

    <xsl:template match="/">
        <xsl:apply-templates select="act|regulation"/>
    </xsl:template>

    <xsl:template match="act|regulation">
        <div class="contents">
            <ul class="nav">
                <xsl:apply-templates select="./body/prov|./body/part|./schedule.group/schedule"/>
            </ul>
        </div>
    </xsl:template>

    <xsl:template match="part[@toc]">
        <li>
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/></xsl:attribute>
              <xsl:attribute name="title">Part <xsl:value-of select="./label"/>&#160;<xsl:value-of select="./heading"/></xsl:attribute>
            <span class="part-label">Part <span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
             <ul class="nav">
                <xsl:apply-templates select="./subpart|./crosshead|./prov"/>
             </ul>
        </li>
    </xsl:template>

    <xsl:template match="schedule[@toc]">
        <li>
            <a>
                <xsl:attribute name="href">#<xsl:value-of select="@id"/></xsl:attribute>
                <xsl:attribute name="title">Schedule <xsl:value-of select="./label"/>&#160;<xsl:value-of select="./heading"/></xsl:attribute>
                <span class="schedule-label">Schedule <span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
             <ul class="nav">
                <xsl:apply-templates select="./schedule.provisions/prov|./schedule.provisions/part" />
             </ul>
        </li>
    </xsl:template>

    <xsl:template match="subpart[@toc]">
        <li>
            <a>
                <xsl:attribute name="href">#<xsl:value-of select="@id"/></xsl:attribute>
                <xsl:attribute name="title">Subpart <xsl:value-of select="./label"/>&#160;<xsl:value-of select="./heading"/></xsl:attribute>
                <span class="subart-label">Subpart <span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
             <ul class="nav">
                <xsl:apply-templates select="./crosshead|./prov"/>
            </ul>
        </li>
    </xsl:template>

    <xsl:template match="crosshead">
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:attribute name="title"><xsl:value-of select="."/></xsl:attribute>
            <span class="crosshead"><xsl:value-of select="."/></span>
            </a>
    </xsl:template>

    <xsl:template match="prov[@toc][not(@quote)]">
        <li>
            <a>
              <xsl:attribute name="href">#<xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:attribute name="title"><xsl:value-of select="./label"/>&#160;<xsl:value-of select="./heading"/></xsl:attribute>
            <span class="prov-label"><span class="number"><xsl:value-of select="./label"/>&#160;</span><xsl:value-of select="./heading"/></span>
            </a>
        </li>
    </xsl:template>



</xsl:stylesheet>